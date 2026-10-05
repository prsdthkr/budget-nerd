import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const blank = { email: '', password: '' }
const defaultTransaction = () => ({ type: 'grocery', name: '', date: new Date().toISOString().slice(0, 10), amount: '', statementMonth: new Date().toISOString().slice(0, 7) })

const CARD_COLORS = [
  { name: 'Ocean', value: '#2563eb' }, { name: 'Sky', value: '#0284c7' }, { name: 'Cyan Blue', value: '#0891b2' }, { name: 'Teal', value: '#0f766e' },
  { name: 'Emerald', value: '#059669' }, { name: 'Lime', value: '#65a30d' }, { name: 'Amber', value: '#d97706' },
  { name: 'Orange', value: '#ea580c' }, { name: 'Rose', value: '#e11d48' }, { name: 'Pink', value: '#db2777' },
  { name: 'Violet', value: '#7c3aed' }, { name: 'Indigo', value: '#4f46e5' }, { name: 'Slate', value: '#475569' },
]

const TRANSACTION_TYPES = [
  { value: 'subscription', label: 'Subscription', emoji: '🔁' },
  { value: 'grocery', label: 'Grocery', emoji: '🛒' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'misc', label: 'Misc', emoji: '✨' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'remit', label: 'Remit', emoji: '💸' },
]

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
  const [cardColor, setCardColor] = useState(CARD_COLORS[0].value)
  const [cardBusy, setCardBusy] = useState(false)
  const [cardActionId, setCardActionId] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [selectedCardColor, setSelectedCardColor] = useState(CARD_COLORS[0].value)
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionForm, setTransactionForm] = useState(defaultTransaction)
  const [transactionBusy, setTransactionBusy] = useState(false)
  const [colorBusy, setColorBusy] = useState(false)
  const [allTransactions, setAllTransactions] = useState([])
  const [allTransactionsLoading, setAllTransactionsLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [editTransactionForm, setEditTransactionForm] = useState(defaultTransaction())
  const [editBusy, setEditBusy] = useState(false)

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null

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
    if (session) {
      loadCards()
      loadAllTransactions()
    } else {
      setCards([])
      setAllTransactions([])
    }
  }, [session])

  useEffect(() => {
    if (selectedCardId) loadTransactions(selectedCardId)
    else setTransactions([])
  }, [selectedCardId])

  const loadCards = async () => {
    setCardsLoading(true)
    const response = await supabase.from('credit_cards').select('id, name, color, sort_order, created_at').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    setCardsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards(response.data || [])
  }

  const loadTransactions = async (cardId) => {
    setTransactionsLoading(true)
    const response = await supabase.from('card_transactions').select('id, card_id, type, name, transaction_date, amount, statement_month, created_at').eq('card_id', cardId).order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    setTransactionsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setTransactions(response.data || [])
  }

  const loadAllTransactions = async () => {
    setAllTransactionsLoading(true)
    const response = await supabase.from('card_transactions').select('id, card_id, type, name, transaction_date, amount, statement_month, created_at').order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    setAllTransactionsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions(response.data || [])
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
    const response = await supabase.from('credit_cards').insert({ name, color: cardColor, sort_order: nextOrder }).select('id, name, color, sort_order, created_at').single()
    setCardBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => [...current, response.data])
    setCardName('')
    setCardColor(CARD_COLORS[0].value)
    setNotice({ type: 'success', text: 'Credit card added.' })
  }

  const openCard = (card) => {
    setSelectedCardId(card.id)
    setSelectedCardColor(card.color || CARD_COLORS[0].value)
    setTransactionForm(defaultTransaction())
    setNotice(null)
  }

  const closeCard = () => {
    setSelectedCardId(null)
    setTransactions([])
  }

  const saveCardColor = async () => {
    if (!selectedCard) return
    setColorBusy(true)
    setNotice(null)
    const response = await supabase.from('credit_cards').update({ color: selectedCardColor }).eq('id', selectedCard.id)
    setColorBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => current.map((card) => card.id === selectedCard.id ? { ...card, color: selectedCardColor } : card))
    setNotice({ type: 'success', text: 'Card color updated.' })
  }

  const deleteCard = async (card) => {
    if (!window.confirm('Delete ' + card.name + '? Its transactions will also be deleted.')) return
    setCardActionId(card.id)
    setNotice(null)
    const response = await supabase.from('credit_cards').delete().eq('id', card.id)
    setCardActionId(null)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    if (selectedCardId === card.id) closeCard()
    setCards((current) => current.filter((item) => item.id !== card.id))
    setAllTransactions((current) => current.filter((item) => item.card_id !== card.id))
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
    const updates = await Promise.all(reordered.map((card, index) => supabase.from('credit_cards').update({ sort_order: index }).eq('id', card.id)))
    setCardActionId(null)
    const failed = updates.find((response) => response.error)
    if (failed) {
      setNotice({ type: 'error', text: failed.error.message })
      await loadCards()
      return
    }
    setCards(reordered.map((card, index) => ({ ...card, sort_order: index })))
  }

  const changeTransaction = ({ target }) => setTransactionForm((current) => ({ ...current, [target.name]: target.value }))

  const addTransaction = async (event) => {
    event.preventDefault()
    if (!selectedCard) return
    const name = transactionForm.name.trim()
    const amount = Number.parseFloat(transactionForm.amount)
    if (!name || !transactionForm.date || !transactionForm.statementMonth || !Number.isFinite(amount)) {
      return setNotice({ type: 'error', text: 'Enter a name, date, statement month, and a valid dollar value.' })
    }
    setTransactionBusy(true)
    setNotice(null)
    const response = await supabase.from('card_transactions').insert({
      card_id: selectedCard.id,
      type: transactionForm.type,
      name,
      transaction_date: transactionForm.date,
      amount,
      statement_month: transactionForm.statementMonth + '-01',
    }).select('id, card_id, type, name, transaction_date, amount, statement_month, created_at').single()
    setTransactionBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setTransactions((current) => [response.data, ...current])
    setAllTransactions((current) => [response.data, ...current])
    setTransactionForm(defaultTransaction())
    setNotice({ type: 'success', text: 'Transaction added to ' + selectedCard.name + '.' })
  }

  const openEditTransaction = (transaction) => {
    setEditingTransaction(transaction)
    setEditTransactionForm({ type: transaction.type, name: transaction.name, date: transaction.transaction_date, amount: String(transaction.amount), statementMonth: transaction.statement_month.slice(0, 7) })
    setNotice(null)
  }

  const changeEditTransaction = ({ target }) => setEditTransactionForm((current) => ({ ...current, [target.name]: target.value }))

  const saveTransaction = async (event) => {
    event.preventDefault()
    if (!editingTransaction) return
    const name = editTransactionForm.name.trim()
    const amount = Number.parseFloat(editTransactionForm.amount)
    if (!name || !editTransactionForm.date || !editTransactionForm.statementMonth || !Number.isFinite(amount)) return setNotice({ type: 'error', text: 'Enter a name, date, statement month, and a valid dollar value.' })
    setEditBusy(true)
    setNotice(null)
    const response = await supabase.from('card_transactions').update({ type: editTransactionForm.type, name, transaction_date: editTransactionForm.date, amount, statement_month: editTransactionForm.statementMonth + '-01' }).eq('id', editingTransaction.id).select('id, card_id, type, name, transaction_date, amount, statement_month, created_at').single()
    setEditBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions((current) => current.map((item) => item.id === response.data.id ? response.data : item))
    setTransactions((current) => current.map((item) => item.id === response.data.id ? response.data : item))
    setEditingTransaction(null)
    setNotice({ type: 'success', text: 'Transaction updated.' })
  }

  const deleteTransaction = async (transaction) => {
    if (!window.confirm('Delete ' + transaction.name + '? This cannot be undone.')) return
    const response = await supabase.from('card_transactions').delete().eq('id', transaction.id)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions((current) => current.filter((item) => item.id !== transaction.id))
    setTransactions((current) => current.filter((item) => item.id !== transaction.id))
    if (editingTransaction?.id === transaction.id) setEditingTransaction(null)
    setNotice({ type: 'success', text: 'Transaction deleted.' })
  }

  if (loading) return <main className="page-shell"><p className="loading">Loading...</p></main>

  if (!session) return <main className="page-shell"><section className="card auth-card">
    <div className="brand-mark">BN</div><p className="eyebrow">Budget Nerd</p><h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1><p className="muted">A React and Supabase starter with secure email authentication.</p>
    <form className="auth-form" onSubmit={submitAuth}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" value={credentials.email} onChange={changeCredentials} placeholder="you@example.com" required /><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={credentials.password} onChange={changeCredentials} placeholder="At least 6 characters" minLength={6} required /><button className="primary-button" disabled={busy}>{busy ? 'Working...' : mode === 'signup' ? 'Sign up' : 'Sign in'}</button></form>
    <button className="link-button" type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setNotice(null) }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</button>{notice && <Notice notice={notice} />}
  </section></main>

  return <main className="app-shell"><Sidebar activeView={activeView} setActiveView={setActiveView} cardsCount={cards.length} transactionsCount={allTransactions.length} email={session.user.email} signOut={signOut} /><section className="content-shell">
    {activeView === 'cards' ? <CardsView cards={cards} cardsLoading={cardsLoading} cardName={cardName} setCardName={setCardName} cardColor={cardColor} setCardColor={setCardColor} cardBusy={cardBusy} cardActionId={cardActionId} addCard={addCard} deleteCard={deleteCard} moveCard={moveCard} openCard={openCard} /> : activeView === 'transactions' ? <TransactionsView transactions={allTransactions} cards={cards} loading={allTransactionsLoading} openEditTransaction={openEditTransaction} deleteTransaction={deleteTransaction} /> : <DashboardView session={session} protectedCheck={protectedCheck} protectedBusy={protectedBusy} result={result} />}
    {notice && <Notice notice={notice} />}
  </section>{selectedCard && <CardDetailModal card={selectedCard} selectedCardColor={selectedCardColor} setSelectedCardColor={setSelectedCardColor} saveCardColor={saveCardColor} colorBusy={colorBusy} closeCard={closeCard} transactions={transactions} transactionsLoading={transactionsLoading} transactionForm={transactionForm} changeTransaction={changeTransaction} addTransaction={addTransaction} transactionBusy={transactionBusy} openEditTransaction={openEditTransaction} deleteTransaction={deleteTransaction} />}{editingTransaction && <TransactionEditModal transaction={editingTransaction} form={editTransactionForm} changeForm={changeEditTransaction} save={saveTransaction} remove={deleteTransaction} busy={editBusy} close={() => setEditingTransaction(null)} />}</main>
}

function Sidebar({ activeView, setActiveView, cardsCount, transactionsCount, email, signOut }) {
  return <aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">BN</div><span>Budget Nerd</span></div><nav className="side-nav" aria-label="Main navigation"><button className={activeView === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('dashboard')}><span>⌂</span>Dashboard</button><button className={activeView === 'cards' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('cards')}><span>▣</span>Cards{cardsCount > 0 && <strong className="nav-count">{cardsCount}</strong>}</button><button className={activeView === 'transactions' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('transactions')}><span>↔</span>Transactions{transactionsCount > 0 && <strong className="nav-count">{transactionsCount}</strong>}</button></nav><div className="sidebar-footer"><p className="sidebar-email" title={email}>{email}</p><button className="nav-signout" onClick={signOut}>Sign out</button></div></aside>
}

function DashboardView({ session, protectedCheck, protectedBusy, result }) {
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Private dashboard</p><h1>Hello World</h1><p className="muted">Your personal finance workspace starts here.</p></div></div><div className="welcome-panel"><span className="status-dot" /><div><p className="muted">Signed in as</p><strong>{session.user.email}</strong></div></div><section className="content-card protected-panel"><div><p className="eyebrow">Protected data check</p><h2>Test authenticated Supabase access</h2><p className="muted">Reads your profile and inserts a user-owned ping through Row Level Security.</p></div><button className="primary-button" onClick={protectedCheck} disabled={protectedBusy}>{protectedBusy ? 'Checking...' : 'Run protected check'}</button></section>{result && <pre className="result-box">{JSON.stringify(result, null, 2)}</pre>}</div>
}

function CardsView({ cards, cardsLoading, cardName, setCardName, cardColor, setCardColor, cardBusy, cardActionId, addCard, deleteCard, moveCard, openCard }) {
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Your wallet</p><h1>Credit cards</h1><p className="muted">Click any card to edit its color or add a transaction.</p></div></div><section className="content-card add-card-panel"><form className="add-card-form" onSubmit={addCard}><div className="add-card-fields"><div><label htmlFor="card-name">Card name</label><input id="card-name" value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="e.g. Everyday Rewards" maxLength={80} required /></div><ColorPicker label="Card color" value={cardColor} onChange={setCardColor} /></div><button className="primary-button" disabled={cardBusy}>{cardBusy ? 'Adding...' : 'Add card'}</button></form></section>{cardsLoading ? <p className="loading">Loading your cards...</p> : cards.length === 0 ? <section className="empty-state"><div className="empty-icon">▣</div><h2>No cards yet</h2><p className="muted">Add your first card above. Only its name and chosen color are stored.</p></section> : <div className="cards-grid">{cards.map((card, index) => <CreditCardView key={card.id} card={card} index={index} total={cards.length} cardActionId={cardActionId} moveCard={moveCard} deleteCard={deleteCard} openCard={openCard} />)}</div>}</div>
}

function CreditCardView({ card, index, total, cardActionId, moveCard, deleteCard, openCard }) {
  const clickCard = () => openCard(card)
  return <article className="credit-card" style={{ '--card-color': card.color || CARD_COLORS[0].value }} onClick={clickCard} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') clickCard() }} role="button" tabIndex="0"><div className="card-chip" /><div className="card-label">Credit card</div><h2>{card.name}</h2><div className="card-placeholder">••••  ••••  ••••  ••••</div><div className="card-actions"><button type="button" title="Move card up" aria-label="Move card up" disabled={index === 0 || cardActionId === card.id} onClick={(event) => { event.stopPropagation(); moveCard(card.id, 'up') }}>↑</button><button type="button" title="Move card down" aria-label="Move card down" disabled={index === total - 1 || cardActionId === card.id} onClick={(event) => { event.stopPropagation(); moveCard(card.id, 'down') }}>↓</button><button type="button" className="delete-card-button" title="Delete card" aria-label={'Delete ' + card.name} disabled={cardActionId === card.id} onClick={(event) => { event.stopPropagation(); deleteCard(card) }}>Delete</button></div></article>
}

function ColorPicker({ label, value, onChange }) {
  return <div className="color-picker"><span className="field-label">{label}</span><div className="color-options" role="radiogroup" aria-label={label}>{CARD_COLORS.map((color) => <button type="button" key={color.value} className={value === color.value ? 'color-swatch selected' : 'color-swatch'} style={{ background: color.value }} title={color.name} aria-label={color.name} aria-checked={value === color.value} role="radio" onClick={() => onChange(color.value)}><span>{value === color.value ? '✓' : ''}</span></button>)}</div></div>
}

function CardDetailModal({ card, selectedCardColor, setSelectedCardColor, saveCardColor, colorBusy, closeCard, transactions, transactionsLoading, transactionForm, changeTransaction, addTransaction, transactionBusy, openEditTransaction, deleteTransaction }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeCard() }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="card-detail-title"><div className="modal-header"><div><p className="eyebrow">Card workspace</p><h2 id="card-detail-title">{card.name}</h2></div><button type="button" className="close-button" onClick={closeCard} aria-label="Close card workspace">×</button></div><div className="detail-columns"><div><div className="detail-preview" style={{ '--card-color': selectedCardColor }}><div className="card-chip" /><span>{card.name}</span><div className="card-placeholder">••••  ••••  ••••  ••••</div></div><div className="detail-section"><h3>Card color</h3><ColorPicker label="Choose a color" value={selectedCardColor} onChange={setSelectedCardColor} /><button type="button" className="secondary-button save-color-button" onClick={saveCardColor} disabled={colorBusy}>{colorBusy ? 'Saving...' : 'Save color'}</button></div></div><div className="transaction-column"><div className="detail-section"><p className="eyebrow">New transaction</p><h3>Add a transaction</h3><form className="transaction-form" onSubmit={addTransaction}><div className="transaction-types" role="radiogroup" aria-label="Transaction type">{TRANSACTION_TYPES.map((type) => <button type="button" key={type.value} className={transactionForm.type === type.value ? 'transaction-type selected' : 'transaction-type'} aria-pressed={transactionForm.type === type.value} onClick={() => changeTransaction({ target: { name: 'type', value: type.value } })}><span>{type.emoji}</span><small>{type.label}</small></button>)}</div><label htmlFor="transaction-name">Name</label><input id="transaction-name" name="name" value={transactionForm.name} onChange={changeTransaction} placeholder="e.g. Supermarket" maxLength={120} required /><div className="form-row"><div><label htmlFor="transaction-date">Date</label><input id="transaction-date" name="date" type="date" value={transactionForm.date} onChange={changeTransaction} required /></div><div><label htmlFor="transaction-amount">Dollar value</label><div className="amount-input"><span>$</span><input id="transaction-amount" name="amount" type="number" step="0.01" value={transactionForm.amount} onChange={changeTransaction} placeholder="0.00" required /></div></div></div><label htmlFor="statement-month">Statement month</label><input id="statement-month" name="statementMonth" type="month" value={transactionForm.statementMonth} onChange={changeTransaction} required /><button className="primary-button" disabled={transactionBusy}>{transactionBusy ? 'Saving...' : 'Add transaction'}</button></form></div></div></div><div className="transaction-history"><div className="history-heading"><h3>Recent transactions</h3><span>{transactions.length}</span></div>{transactionsLoading ? <p className="muted">Loading transactions...</p> : transactions.length === 0 ? <p className="muted">No transactions for this card yet.</p> : <div className="transaction-list">{transactions.map((transaction) => <div className="transaction-row" key={transaction.id}><span className="transaction-emoji">{transactionType(transaction.type).emoji}</span><div className="transaction-meta"><strong>{transaction.name}</strong><small>{transactionType(transaction.type).label} · {formatDate(transaction.transaction_date)} · Statement {formatMonth(transaction.statement_month)}</small></div><strong className="transaction-amount">{formatAmount(transaction.amount)}</strong><div className="transaction-row-actions"><button type="button" onClick={() => openEditTransaction(transaction)}>Edit</button><button type="button" onClick={() => deleteTransaction(transaction)}>Delete</button></div></div>)}</div>}</div></section></div>
}

function TransactionsView({ transactions, cards, loading, openEditTransaction, deleteTransaction }) {
  const cardNames = new Map(cards.map((card) => [card.id, card.name]))
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Activity</p><h1>Transactions</h1><p className="muted">Review and edit transactions across all of your credit cards.</p></div></div><section className="content-card transactions-page"><div className="history-heading"><h3>All transactions</h3><span>{transactions.length}</span></div>{loading ? <p className="muted">Loading transactions...</p> : transactions.length === 0 ? <div className="empty-state compact"><div className="empty-icon">↔</div><h2>No transactions yet</h2><p className="muted">Add a transaction from a card workspace to see it here.</p></div> : <div className="transaction-list full-list">{transactions.map((transaction) => <div className="transaction-row" key={transaction.id}><span className="transaction-emoji">{transactionType(transaction.type).emoji}</span><div className="transaction-meta"><strong>{transaction.name}</strong><small>{cardNames.get(transaction.card_id) || 'Unknown card'} · {transactionType(transaction.type).label} · {formatDate(transaction.transaction_date)} · Statement {formatMonth(transaction.statement_month)}</small></div><strong className="transaction-amount">{formatAmount(transaction.amount)}</strong><div className="transaction-row-actions"><button type="button" onClick={() => openEditTransaction(transaction)}>Edit</button><button type="button" onClick={() => deleteTransaction(transaction)}>Delete</button></div></div>)}</div>}</section></div>
}

function TransactionEditModal({ transaction, form, changeForm, save, remove, busy, close }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}><section className="modal-card edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-transaction-title"><div className="modal-header"><div><p className="eyebrow">Edit transaction</p><h2 id="edit-transaction-title">{transaction.name}</h2></div><button type="button" className="close-button" onClick={close} aria-label="Close edit transaction">×</button></div><form className="transaction-form" onSubmit={save}><div className="transaction-types" role="radiogroup" aria-label="Transaction type">{TRANSACTION_TYPES.map((type) => <button type="button" key={type.value} className={form.type === type.value ? 'transaction-type selected' : 'transaction-type'} aria-pressed={form.type === type.value} onClick={() => changeForm({ target: { name: 'type', value: type.value } })}><span>{type.emoji}</span><small>{type.label}</small></button>)}</div><label htmlFor="edit-transaction-name">Name</label><input id="edit-transaction-name" name="name" value={form.name} onChange={changeForm} maxLength={120} required /><div className="form-row"><div><label htmlFor="edit-transaction-date">Date</label><input id="edit-transaction-date" name="date" type="date" value={form.date} onChange={changeForm} required /></div><div><label htmlFor="edit-transaction-amount">Dollar value</label><div className="amount-input"><span>$</span><input id="edit-transaction-amount" name="amount" type="number" step="0.01" value={form.amount} onChange={changeForm} required /></div></div></div><label htmlFor="edit-statement-month">Statement month</label><input id="edit-statement-month" name="statementMonth" type="month" value={form.statementMonth} onChange={changeForm} required /><div className="edit-actions"><button type="button" className="danger-button" onClick={() => remove(transaction)}>Delete</button><button className="primary-button" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button></div></form></section></div>
}

function transactionType(value) { return TRANSACTION_TYPES.find((type) => type.value === value) || TRANSACTION_TYPES[3] }
function formatDate(value) { return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
function formatMonth(value) { return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) }
function formatAmount(value) { const amount = Number(value); return amount < 0 ? '-$ ' + Math.abs(amount).toFixed(2) : '$ ' + amount.toFixed(2) }
function Notice({ notice }) { return <p className={'notice ' + notice.type} role="status">{notice.text}</p> }
