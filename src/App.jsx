import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const blank = { email: '', password: '' }

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('signin')
  const [credentials, setCredentials] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [protectedBusy, setProtectedBusy] = useState(false)
  const [activeView, setActiveView] = useState('dashboard')
  const [notice, setNotice] = useState(null)
  const [result, setResult] = useState(null)
  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardBusy, setCardBusy] = useState(false)
  const [cardActionId, setCardActionId] = useState(null)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) setNotice({ type: 'error', text: error.message })
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return
      setSession(nextSession)
      setLoading(false)
      setResult(null)
    })
    return () => { mounted = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (session) loadCards()
    else setCards([])
  }, [session])

  const loadCards = async () => {
    setCardsLoading(true)
    const response = await supabase
      .from('credit_cards')
      .select('id, name, sort_order, created_at')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setCardsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards(response.data || [])
  }

  const changeCredentials = ({ target }) => setCredentials((current) => ({ ...current, [target.name]: target.value }))

  const submitAuth = async (event) => {
    event.preventDefault()
    setBusy(true)
    setNotice(null)
    const email = credentials.email.trim()
    const response = mode === 'signup'
      ? await supabase.auth.signUp({ email, password: credentials.password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password: credentials.password })
    setBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    if (mode === 'signup' && !response.data.session) {
      setMode('signin')
      return setNotice({ type: 'success', text: 'Account created. Check your email, then sign in.' })
    }
    setCredentials(blank)
    setNotice({ type: 'success', text: 'You are signed in.' })
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) setNotice({ type: 'error', text: error.message })
  }

  const protectedCheck = async () => {
    if (!session?.user?.id) return
    setProtectedBusy(true)
    setResult(null)
    setNotice(null)
    const profile = await supabase.from('profiles').select('id, email, created_at').eq('id', session.user.id).maybeSingle()
    if (profile.error) {
      setProtectedBusy(false)
      return setNotice({ type: 'error', text: profile.error.message })
    }
    const ping = await supabase.from('pings').insert({ message: 'Authenticated request succeeded.' }).select('id, message, created_at').single()
    setProtectedBusy(false)
    if (ping.error) return setNotice({ type: 'error', text: ping.error.message })
    setResult({ profile: profile.data, ping: ping.data })
    setNotice({ type: 'success', text: 'Authenticated query and insert succeeded. RLS allowed this user.' })
  }

  const addCard = async (event) => {
    event.preventDefault()
    const name = cardName.trim()
    if (!name) return
    setCardBusy(true)
    setNotice(null)
    const nextOrder = cards.length ? Math.max(...cards.map((card) => card.sort_order)) + 1 : 0
    const response = await supabase
      .from('credit_cards')
      .insert({ name, sort_order: nextOrder })
      .select('id, name, sort_order, created_at')
      .single()
    setCardBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => [...current, response.data])
    setCardName('')
    setNotice({ type: 'success', text: 'Credit card added.' })
  }

  const deleteCard = async (card) => {
    if (!window.confirm('Delete ' + card.name + '? This cannot be undone.')) return
    setCardActionId(card.id)
    setNotice(null)
    const response = await supabase.from('credit_cards').delete().eq('id', card.id)
    setCardActionId(null)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => current.filter((item) => item.id !== card.id))
    setNotice({ type: 'success', text: 'Credit card deleted.' })
  }

  const moveCard = async (cardId, direction) => {
    const currentIndex = cards.findIndex((card) => card.id === cardId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= cards.length) return
    const reordered = [...cards]
    const currentCard = reordered[currentIndex]
    reordered[currentIndex] = reordered[targetIndex]
    reordered[targetIndex] = currentCard
    setCardActionId(cardId)
    setNotice(null)
    const updates = await Promise.all(reordered.map((card, index) =>
      supabase.from('credit_cards').update({ sort_order: index }).eq('id', card.id),
    ))
    setCardActionId(null)
    const failed = updates.find((response) => response.error)
    if (failed) {
      setNotice({ type: 'error', text: failed.error.message })
      await loadCards()
      return
    }
    setCards(reordered.map((card, index) => ({ ...card, sort_order: index })))
  }

  if (loading) return <main className="page-shell"><p className="loading">Loading...</p></main>

  if (!session) return (
    <main className="page-shell"><section className="card auth-card">
      <div className="brand-mark">BN</div>
      <p className="eyebrow">Budget Nerd</p>
      <h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
      <p className="muted">A React and Supabase starter with secure email authentication.</p>
      <form className="auth-form" onSubmit={submitAuth}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" value={credentials.email} onChange={changeCredentials} placeholder="you@example.com" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={credentials.password} onChange={changeCredentials} placeholder="At least 6 characters" minLength={6} required />
        <button className="primary-button" disabled={busy}>{busy ? 'Working...' : mode === 'signup' ? 'Sign up' : 'Sign in'}</button>
      </form>
      <button className="link-button" type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setNotice(null) }}>
        {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
      {notice && <Notice notice={notice} />}
    </section></main>
  )

  return <main className="app-shell">
    <Sidebar activeView={activeView} setActiveView={setActiveView} cardsCount={cards.length} email={session.user.email} signOut={signOut} />
    <section className="content-shell">
      {activeView === 'cards'
        ? <CardsView cards={cards} cardsLoading={cardsLoading} cardName={cardName} setCardName={setCardName} cardBusy={cardBusy} cardActionId={cardActionId} addCard={addCard} deleteCard={deleteCard} moveCard={moveCard} />
        : <DashboardView session={session} protectedCheck={protectedCheck} protectedBusy={protectedBusy} result={result} />}
      {notice && <Notice notice={notice} />}
    </section>
  </main>
}

function Sidebar({ activeView, setActiveView, cardsCount, email, signOut }) {
  return <aside className="sidebar">
    <div className="sidebar-brand"><div className="brand-mark">BN</div><span>Budget Nerd</span></div>
    <nav className="side-nav" aria-label="Main navigation">
      <button className={activeView === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('dashboard')}><span>⌂</span>Dashboard</button>
      <button className={activeView === 'cards' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('cards')}><span>▣</span>Cards{cardsCount > 0 && <strong className="nav-count">{cardsCount}</strong>}</button>
    </nav>
    <div className="sidebar-footer"><p className="sidebar-email" title={email}>{email}</p><button className="nav-signout" onClick={signOut}>Sign out</button></div>
  </aside>
}

function DashboardView({ session, protectedCheck, protectedBusy, result }) {
  return <div className="view-stack">
    <div className="page-heading"><div><p className="eyebrow">Private dashboard</p><h1>Hello World</h1><p className="muted">Your personal finance workspace starts here.</p></div></div>
    <div className="welcome-panel"><span className="status-dot" /><div><p className="muted">Signed in as</p><strong>{session.user.email}</strong></div></div>
    <section className="content-card protected-panel"><div><p className="eyebrow">Protected data check</p><h2>Test authenticated Supabase access</h2><p className="muted">Reads your profile and inserts a user-owned ping through Row Level Security.</p></div><button className="primary-button" onClick={protectedCheck} disabled={protectedBusy}>{protectedBusy ? 'Checking...' : 'Run protected check'}</button></section>
    {result && <pre className="result-box">{JSON.stringify(result, null, 2)}</pre>}
  </div>
}

function CardsView({ cards, cardsLoading, cardName, setCardName, cardBusy, cardActionId, addCard, deleteCard, moveCard }) {
  return <div className="view-stack">
    <div className="page-heading"><div><p className="eyebrow">Your wallet</p><h1>Credit cards</h1><p className="muted">Keep your cards organized. You can add account details and transactions later.</p></div></div>
    <section className="content-card add-card-panel"><form className="add-card-form" onSubmit={addCard}><div><label htmlFor="card-name">Card name</label><input id="card-name" value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="e.g. Everyday Rewards" maxLength={80} required /></div><button className="primary-button" disabled={cardBusy}>{cardBusy ? 'Adding...' : 'Add card'}</button></form></section>
    {cardsLoading ? <p className="loading">Loading your cards...</p> : cards.length === 0 ? <section className="empty-state"><div className="empty-icon">▣</div><h2>No cards yet</h2><p className="muted">Add your first card above. Only its name is stored for now.</p></section> : <div className="cards-grid">{cards.map((card, index) => <article className="credit-card" key={card.id}><div className="card-chip" /><div className="card-label">Credit card</div><h2>{card.name}</h2><div className="card-placeholder">••••  ••••  ••••  ••••</div><div className="card-actions"><button title="Move card up" aria-label="Move card up" disabled={index === 0 || cardActionId === card.id} onClick={() => moveCard(card.id, 'up')}>↑</button><button title="Move card down" aria-label="Move card down" disabled={index === cards.length - 1 || cardActionId === card.id} onClick={() => moveCard(card.id, 'down')}>↓</button><button className="delete-card-button" title="Delete card" aria-label={'Delete ' + card.name} disabled={cardActionId === card.id} onClick={() => deleteCard(card)}>Delete</button></div></article>)}</div>}
  </div>
}

function Notice({ notice }) { return <p className={'notice ' + notice.type} role="status">{notice.text}</p> }
