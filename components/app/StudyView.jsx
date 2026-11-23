"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Study tools: decks, the files behind them, and the cards inside.
//
// What is missing here is the interesting part. A deck is meant to be made by
// reading an upload and generating cards from it, and no model is connected
// yet — so a new deck sits at `uploaded` and says so, rather than sitting at
// `ready` with nothing in it. A student who uploads a PDF and sees an empty
// deck labelled ready would reasonably think the app had lost their work.
//
// Writing cards by hand works today and is not a placeholder: it is how most
// revision decks get made anyway. Those are stored with ai_generated = false,
// so the two kinds never get confused once generation does arrive.

const STATUS_TEXT = {
  uploaded: "File stored. Cards are not generated yet — that needs the Advisor, which is not connected.",
  extracting: "Reading the file…",
  generating: "Writing cards…",
  ready: "Ready to study.",
  failed: "Something went wrong with this deck.",
};

const MAX_BYTES = 104857600; // 100 MB, matching the bucket and the site's promise

function Cards({ deck, onCount }) {
  const [cards, setCards] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    let live = true;
    (async () => {
      const { data } = await supabase.from("cards")
        .select("id, question, answer, ai_generated").eq("deck_id", deck.id).order("created_at");
      if (live) setCards(data || []);
    })();
    return () => { live = false; };
  }, [deck.id]);

  async function addCard(event) {
    event.preventDefault();
    if (busy || !question.trim() || !answer.trim()) return;
    setBusy(true);
    setError("");

    const { data, error: insertError } = await supabase.from("cards").insert({
      deck_id: deck.id,
      question: question.trim(),
      answer: answer.trim(),
      ai_generated: false,
    }).select("id, question, answer, ai_generated").maybeSingle();

    if (insertError) setError(insertError.message);
    else if (data) {
      const next = [...(cards || []), data];
      setCards(next);
      setQuestion("");
      setAnswer("");
      // card_count is the deck's own tally; keep it true rather than letting
      // the list and the badge disagree.
      await supabase.from("decks").update({ card_count: next.length }).eq("id", deck.id);
      onCount?.(deck.id, next.length);
    }
    setBusy(false);
  }

  async function removeCard(id) {
    const { error: deleteError } = await supabase.from("cards").delete().eq("id", id);
    if (deleteError) { setError(deleteError.message); return; }
    const next = (cards || []).filter((card) => card.id !== id);
    setCards(next);
    await supabase.from("decks").update({ card_count: next.length }).eq("id", deck.id);
    onCount?.(deck.id, next.length);
  }

  if (cards === null) return <p>Loading cards…</p>;

  return <>
    {cards.length === 0
      ? <p>No cards in this deck yet. Write one below.</p>
      : <ul className="check-list">
          {cards.map((card) => <li key={card.id}>
            <b>{card.question}</b>
            {revealed[card.id]
              ? <> — {card.answer}</>
              : <> — <button className="text-button" type="button"
                  onClick={() => setRevealed((r) => ({ ...r, [card.id]: true }))}>show answer</button></>}
            {card.ai_generated && <span className="pill"> AI-written</span>}
            {" "}
            <button className="text-button" type="button" onClick={() => removeCard(card.id)}>delete</button>
          </li>)}
        </ul>}

    <form className="simple-form" onSubmit={addCard}>
      <label>Question<input value={question} onChange={(e) => setQuestion(e.target.value)} required/></label>
      <label>Answer<input value={answer} onChange={(e) => setAnswer(e.target.value)} required/></label>
      {error && <p className="form-note" role="alert">{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add card"}
      </button>
    </form>
  </>;
}

export function StudyView() {
  const [state, setState] = useState({ loading: true });
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [openDeck, setOpenDeck] = useState(null);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("decks").select("id, title, status, card_count, error, created_at")
      .order("created_at", { ascending: false });
    setState({ loading: false, decks: data || [], error: loadError?.message });
  }

  useEffect(() => { load(); }, []);

  async function createDeck(event) {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (file && file.size > MAX_BYTES) {
      setError("That file is over 100 MB, which is the limit.");
      return;
    }

    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const studentId = session?.user?.id;

    const { data: deck, error: deckError } = await supabase.from("decks").insert({
      student_id: studentId,
      title: title.trim() || "Study deck",
    }).select("id, title, status, card_count, error, created_at").maybeSingle();

    if (deckError || !deck) { setError(deckError?.message || "Could not create the deck."); setBusy(false); return; }

    if (file) {
      const path = `${studentId}/${deck.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from("study-uploads").upload(path, file);

      if (uploadError) {
        // Leaving a deck behind with no file is worse than no deck at all: it
        // would sit in the list looking like work the student did.
        await supabase.from("decks").delete().eq("id", deck.id);
        setError("The file did not upload: " + uploadError.message);
        setBusy(false);
        return;
      }

      const { error: fileError } = await supabase.from("deck_files").insert({
        deck_id: deck.id,
        file_name: file.name,
        storage_path: path,
        byte_size: file.size,
      });
      if (fileError) setError("The file uploaded, but we could not record it: " + fileError.message);
    }

    setTitle("");
    setFile(null);
    setBusy(false);
    await load();
  }

  async function removeDeck(id) {
    const { error: deleteError } = await supabase.from("decks").delete().eq("id", id);
    if (deleteError) { setError(deleteError.message); return; }
    if (openDeck?.id === id) setOpenDeck(null);
    await load();
  }

  if (state.loading) return <p>Loading your decks…</p>;
  if (state.error) return <><h1>Study tools</h1><p role="alert">{state.error}</p></>;

  const decks = state.decks || [];

  return <>
    <div className="topbar"><div className="greeting">
      <h1>Study tools</h1>
      <p>Decks of cards, made from what you upload or written yourself.</p>
    </div></div>

    <div className="card">
      <h3>New deck</h3>
      <form className="simple-form" onSubmit={createDeck}>
        <label>Name<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Study deck"/></label>
        <label>File (optional)
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}/>
        </label>
        <p className="form-note">Up to 100 MB, and up to ten files in a deck. Only you can read what you upload.</p>
        {error && <p className="form-note" role="alert">{error}</p>}
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create deck"}
        </button>
      </form>
    </div>

    {decks.length === 0
      ? <div className="card"><p>No decks yet.</p></div>
      : decks.map((deck) => <div className="card" key={deck.id}>
          <div className="uni-head">
            <h3>{deck.title}</h3>
            <span className="pill">{deck.card_count} card{deck.card_count === 1 ? "" : "s"}</span>
          </div>
          <p className="ai-note">{deck.error || STATUS_TEXT[deck.status] || deck.status}</p>

          <div className="button-row">
            <button className="btn-outline" type="button"
              onClick={() => setOpenDeck(openDeck?.id === deck.id ? null : deck)}>
              {openDeck?.id === deck.id ? "Close" : "Open"}
            </button>
            <button className="text-button" type="button" onClick={() => removeDeck(deck.id)}>Delete deck</button>
          </div>

          {openDeck?.id === deck.id && <Cards
            deck={deck}
            onCount={(id, count) => setState((prev) => ({
              ...prev,
              decks: prev.decks.map((d) => (d.id === id ? { ...d, card_count: count } : d)),
            }))}
          />}
        </div>)}
  </>;
}
