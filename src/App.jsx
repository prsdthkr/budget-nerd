import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Alert from 'react-bootstrap/Alert'
import Button from 'react-bootstrap/Button'
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import Card from 'react-bootstrap/Card'
import Form from 'react-bootstrap/Form'
import InputGroup from 'react-bootstrap/InputGroup'
import Nav from 'react-bootstrap/Nav'
import Modal from 'react-bootstrap/Modal'
import ProgressBar from 'react-bootstrap/ProgressBar'
import Tab from 'react-bootstrap/Tab'
import Tabs from 'react-bootstrap/Tabs'
import Toast from 'react-bootstrap/Toast'
import ToastContainer from 'react-bootstrap/ToastContainer'
import { ResponsiveSankey } from '@nivo/sankey'
import { Typeahead } from 'react-bootstrap-typeahead'
import DatePicker from 'react-datepicker'

const blank = { email: '', password: '' }
const VIEW_PATHS = { dashboard: '/dashboard', cards: '/cards', transactions: '/transactions', spend: '/spend', plan: '/plan', cashflow: '/cashflow', settings: '/settings' }
const PATH_VIEWS = Object.fromEntries(Object.entries(VIEW_PATHS).map(([view, path]) => [path, view]))

const ACCOUNT_CURRENCIES = [
  { code: 'USD', label: 'US Dollar' }, { code: 'EUR', label: 'Euro' }, { code: 'GBP', label: 'British Pound' },
  { code: 'CAD', label: 'Canadian Dollar' }, { code: 'AUD', label: 'Australian Dollar' }, { code: 'INR', label: 'Indian Rupee' },
  { code: 'JPY', label: 'Japanese Yen' }, { code: 'CHF', label: 'Swiss Franc' }, { code: 'SGD', label: 'Singapore Dollar' },
]


const defaultTransaction = (type = 'misc', statementMonth = new Date().toISOString().slice(0, 7), cashflowMonth = new Date().toISOString().slice(0, 7)) => ({ type, name: '', date: new Date().toISOString().slice(0, 10), amount: '', statementMonth, cashflowMonth })

const CARD_COLORS = [
  { name: 'Ocean', value: '#2563eb' }, { name: 'Sky', value: '#0284c7' }, { name: 'Cyan Blue', value: '#0891b2' }, { name: 'Aqua', value: '#48cae4' }, { name: 'Pacific Blue', value: '#0077b6' }, { name: 'Teal', value: '#0f766e' },
  { name: 'Emerald', value: '#059669' }, { name: 'Lime', value: '#65a30d' }, { name: 'Amber', value: '#d97706' }, { name: 'Gold', value: '#b8860b' },
  { name: 'Orange', value: '#ea580c' }, { name: 'Rose', value: '#e11d48' }, { name: 'Pink', value: '#db2777' },
  { name: 'Violet', value: '#7c3aed' }, { name: 'Indigo', value: '#4f46e5' }, { name: 'Slate', value: '#475569' }, { name: 'White', value: '#ffffff' },
]

const TRANSACTION_TYPES = [
  { value: 'subscription', label: 'Subscription', emoji: '🔁' },
  { value: 'grocery', label: 'Grocery', emoji: '🛒' },
  { value: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { value: 'misc', label: 'Misc', emoji: '✨' },
  { value: 'rent', label: 'Rent', emoji: '🏠' },
  { value: 'supplies', label: 'Supplies', emoji: '📦' },
  { value: 'utilities', label: 'Utilities', emoji: '💡' },
  { value: 'travel', label: 'Travel', emoji: '✈️' },
  { value: 'food', label: 'Food', emoji: '🍽️' },
  { value: 'remit', label: 'Remit', emoji: '💸' },
  { value: 'cashback', label: 'Cashback', emoji: '💰' },
  { value: 'car', label: 'Car', emoji: '🚗' },
]


const SPEND_TYPES = TRANSACTION_TYPES.filter((type) => ['grocery', 'shopping', 'food', 'misc'].includes(type.value))
const CASHFLOW_MONTHS = 12
const blankActivityFilters = { name: '', amount: '', dateFrom: '', dateTo: '', statementMonth: '', cashflowMonth: '', cardId: '', category: '' }
const defaultLedgerForm = (accountId = '') => ({ accountId, description: '', date: new Date().toISOString().slice(0, 10), cashflowMonth: '', realizedAmount: '', plannedAmount: '', recurring: false })
export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('signin')
  const [credentials, setCredentials] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [protectedBusy, setProtectedBusy] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const activeView = PATH_VIEWS[location.pathname] || 'cards'
  const setActiveView = (view) => navigate(VIEW_PATHS[view] || VIEW_PATHS.cards)
  const [notice, setNotice] = useState(null)
  const [result, setResult] = useState(null)
  const [cards, setCards] = useState([])
  const [cardsLoading, setCardsLoading] = useState(false)
  const [cardName, setCardName] = useState('')
  const [cardColor, setCardColor] = useState(CARD_COLORS[0].value)
  const [cardDefaultCategory, setCardDefaultCategory] = useState('misc')
  const [cardStatementDay, setCardStatementDay] = useState('')
  const [cardDueDay, setCardDueDay] = useState('')
  const [addCardOpen, setAddCardOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [cardBusy, setCardBusy] = useState(false)
  const [cardActionId, setCardActionId] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const [workspaceTab, setWorkspaceTab] = useState('add')
  const [statementMonthFilter, setStatementMonthFilter] = useState('')
  const [statementSearch, setStatementSearch] = useState('')
  const [selectedCardColor, setSelectedCardColor] = useState(CARD_COLORS[0].value)
  const [selectedCardDefaultCategory, setSelectedCardDefaultCategory] = useState('misc')
  const [selectedCardStatementDay, setSelectedCardStatementDay] = useState('')
  const [selectedCardDueDay, setSelectedCardDueDay] = useState('')
  const [selectedCardDefaultStatementMonth, setSelectedCardDefaultStatementMonth] = useState('')
  const [defaultMonthBusy, setDefaultMonthBusy] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [transactionForm, setTransactionForm] = useState(defaultTransaction)
  const [transactionBusy, setTransactionBusy] = useState(false)
  const [colorBusy, setColorBusy] = useState(false)
  const [allTransactions, setAllTransactions] = useState([])
  const [allTransactionsLoading, setAllTransactionsLoading] = useState(false)
  const [activityTransactions, setActivityTransactions] = useState([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityFilters, setActivityFilters] = useState(blankActivityFilters)
  const [categoryLimits, setCategoryLimits] = useState({})
  const [spendMonth, setSpendMonth] = useState(() => formatIsoMonth(new Date()))
  const [cashflowMonth, setCashflowMonth] = useState(() => formatIsoMonth(new Date()))
  const [limitsLoading, setLimitsLoading] = useState(false)
  const [limitsOpen, setLimitsOpen] = useState(false)
  const [limitsBusy, setLimitsBusy] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [editTransactionForm, setEditTransactionForm] = useState(defaultTransaction())
  const [editBusy, setEditBusy] = useState(false)
  const [bankAccounts, setBankAccounts] = useState([])
  const [bankLedger, setBankLedger] = useState([])
  const [bankLoading, setBankLoading] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [accountForm, setAccountForm] = useState({ name: '', accountNumber: '', routingNumber: '', startingBalance: '', minimumBalance: '', currency: 'USD' })
  const [accountBusy, setAccountBusy] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferBusy, setTransferBusy] = useState(false)
  const [transferForm, setTransferForm] = useState({ sourceAccountId: '', destinationAccountId: '', description: 'Account transfer', date: new Date().toISOString().slice(0, 10), amount: '', kind: 'realized' })
  const [editingAccount, setEditingAccount] = useState(null)
  const [selectedAccountId, setSelectedAccountId] = useState(null)
  const [planMonth, setPlanMonth] = useState(() => formatIsoMonth(new Date()))
  const [ledgerForm, setLedgerForm] = useState(defaultLedgerForm)
  const [editingLedger, setEditingLedger] = useState(null)
  const [ledgerBusy, setLedgerBusy] = useState(false)
  const [ledgerFormOpen, setLedgerFormOpen] = useState(false)
  const [paymentBusy, setPaymentBusy] = useState(false)

  const selectedCard = cards.find((card) => card.id === selectedCardId) || null
  const transactionSuggestions = [...new Set(allTransactions.filter((transaction) => transaction.type === transactionForm.type).map((transaction) => transaction.name))]
  const editTransactionSuggestions = [...new Set(allTransactions.filter((transaction) => transaction.type === editTransactionForm.type).map((transaction) => transaction.name))]

  useEffect(() => {
    if (!PATH_VIEWS[location.pathname]) navigate(VIEW_PATHS.cards, { replace: true })
  }, [location.pathname, navigate])

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
      loadCategoryLimits()
      loadBankData()
    } else {
      setCards([])
      setAllTransactions([])
      setActivityTransactions([])
      setCategoryLimits({})
      setBankAccounts([])
      setBankLedger([])
    }
  }, [session])

  useEffect(() => {
    if (selectedCardId) loadTransactions(selectedCardId)
    else setTransactions([])
  }, [selectedCardId])

  const loadCards = async () => {
    setCardsLoading(true)
    const response = await supabase.from('credit_cards').select('id, name, color, default_category, statement_day, due_day, default_statement_month, sort_order, created_at').order('sort_order', { ascending: true }).order('created_at', { ascending: true })
    setCardsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards(orderCardsByStatementDate(response.data || []))
  }

  const loadTransactions = async (cardId) => {
    setTransactionsLoading(true)
    const response = await supabase.from('card_transactions').select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at').eq('card_id', cardId).order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    setTransactionsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setTransactions(response.data || [])
  }

  const loadAllTransactions = async () => {
    setAllTransactionsLoading(true)
    const response = await supabase.from('card_transactions').select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at').order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    setAllTransactionsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions(response.data || [])
  }

  const loadBankData = async () => {
    setBankLoading(true)
    const [accountsResponse, ledgerResponse] = await Promise.all([
      supabase.from('bank_accounts').select('id, name, account_number, routing_number, starting_balance, minimum_balance, currency, created_at').order('created_at', { ascending: true }),
      supabase.from('account_ledger_items').select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').order('ledger_date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setBankLoading(false)
    if (accountsResponse.error) return setNotice({ type: 'error', text: accountsResponse.error.message })
    if (ledgerResponse.error) return setNotice({ type: 'error', text: ledgerResponse.error.message })
    const loadedAccounts = accountsResponse.data || []
    setBankAccounts(loadedAccounts)
    setBankLedger(ledgerResponse.data || [])
    if (!selectedAccountId && loadedAccounts[0]) setSelectedAccountId(loadedAccounts[0].id)
  }

  const openBankAccount = (account) => {
    setSelectedAccountId(account.id)
    setPlanMonth(formatIsoMonth(new Date()))
    setLedgerForm(defaultLedgerForm(account.id))
    setEditingLedger(null)
  }

  const saveBankAccount = async (event) => {
    event.preventDefault()
    const name = accountForm.name.trim()
    const accountNumber = accountForm.accountNumber.trim()
    const routingNumber = accountForm.routingNumber.trim()
    const startingBalance = Number(String(accountForm.startingBalance || 0).replace(/[$,]/g, ''))
    const currency = accountForm.currency || 'USD'
    const minimumBalance = Number(String(accountForm.minimumBalance || 0).replace(/[$,]/g, ''))
    if (!name || !accountNumber || !routingNumber || !Number.isFinite(startingBalance) || !Number.isFinite(minimumBalance)) return setNotice({ type: 'error', text: 'Enter an account name, account number, routing number, and valid starting balance.' })
    setAccountBusy(true)
    const values = { name, account_number: accountNumber, routing_number: routingNumber, starting_balance: startingBalance, minimum_balance: minimumBalance, currency }
    const response = editingAccount ? await supabase.from('bank_accounts').update(values).eq('id', editingAccount.id).select('id, name, account_number, routing_number, starting_balance, minimum_balance, created_at').single() : await supabase.from('bank_accounts').insert(values).select('id, name, account_number, routing_number, starting_balance, created_at').single()
    setAccountBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setBankAccounts((current) => editingAccount ? current.map((account) => account.id === response.data.id ? response.data : account) : [...current, response.data])
    setAccountForm({ name: '', accountNumber: '', routingNumber: '', startingBalance: '', minimumBalance: '', currency: 'USD' })
    setEditingAccount(null)
    setAddAccountOpen(false)
    setNotice({ type: 'success', text: editingAccount ? 'Bank account details updated.' : 'Bank account added.' })
  }

  const openTransfer = (account) => {
    setTransferForm({ sourceAccountId: account.id, destinationAccountId: '', description: 'Account transfer', date: new Date().toISOString().slice(0, 10), amount: '' })
    setTransferOpen(true)
  }

  const saveTransfer = async (event) => {
    event.preventDefault()
    const source = bankAccounts.find((account) => account.id === transferForm.sourceAccountId)
    const destination = bankAccounts.find((account) => account.id === transferForm.destinationAccountId)
    const amount = Number(String(transferForm.amount || '').replace(/[$,]/g, ''))
    if (!source || !destination || source.id === destination.id) return setNotice({ type: 'error', text: 'Choose two different bank accounts.' })
    if ((source.currency || 'USD') !== (destination.currency || 'USD')) return setNotice({ type: 'error', text: 'Transfers are only available between accounts with the same currency.' })
    if (!transferForm.date || !Number.isFinite(amount) || amount <= 0) return setNotice({ type: 'error', text: 'Enter a date and a transfer amount greater than zero.' })
    setTransferBusy(true)
    setNotice(null)
    const fields = 'id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at'
    const isPlanned = transferForm.kind === 'planned'
    const sourceValues = { account_id: source.id, description: transferForm.description.trim() || 'Account transfer to ' + destination.name, ledger_date: transferForm.date, realized_amount: isPlanned ? 0 : -amount, planned_amount: isPlanned ? -amount : 0, recurring: false }
    const sourceEntry = await supabase.from('account_ledger_items').insert(sourceValues).select(fields).single()
    if (sourceEntry.error) { setTransferBusy(false); return setNotice({ type: 'error', text: sourceEntry.error.message }) }
    const destinationEntry = await supabase.from('account_ledger_items').insert({ ...sourceValues, account_id: destination.id, description: transferForm.description.trim() || 'Account transfer from ' + source.name, realized_amount: isPlanned ? 0 : amount, planned_amount: isPlanned ? amount : 0 }).select(fields).single()
    if (destinationEntry.error) {
      await supabase.from('account_ledger_items').delete().eq('id', sourceEntry.data.id)
      setTransferBusy(false)
      return setNotice({ type: 'error', text: destinationEntry.error.message })
    }
    setBankLedger((current) => [sourceEntry.data, destinationEntry.data, ...current])
    setTransferBusy(false)
    setTransferOpen(false)
    setNotice({ type: 'success', text: 'Transfer recorded in both account ledgers.' })
  }

  const changeLedgerForm = ({ target }) => setLedgerForm((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }))
  const swapLedgerAmounts = () => setLedgerForm((current) => ({ ...current, realizedAmount: current.plannedAmount, plannedAmount: current.realizedAmount }))
  const swapLedgerItemAmounts = async (item) => {
    if (item.source_type === 'card_payment') { setNotice({ type: 'error', text: 'Card payment amounts are calculated from statement transactions.' }); return false }
    const response = await supabase.from('account_ledger_items').update({ realized_amount: Number(item.planned_amount || 0), planned_amount: Number(item.realized_amount || 0) }).eq('id', item.id).select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').single()
    if (response.error) { setNotice({ type: 'error', text: response.error.message }); return false }
    setBankLedger((current) => current.map((entry) => entry.id === item.id ? response.data : entry))
    return true
  }

  const updateLedgerAmountInline = async (item, field, value) => {
    if (item.source_type === 'card_payment') { setNotice({ type: 'error', text: 'Card payment amounts are calculated from statement transactions.' }); return false }
    const amount = Number(String(value).replace(/[$,]/g, '').trim())
    if (!Number.isFinite(amount)) { setNotice({ type: 'error', text: 'Enter a valid amount.' }); return false }
    const response = await supabase.from('account_ledger_items').update({ [field]: amount }).eq('id', item.id).select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').single()
    if (response.error) { setNotice({ type: 'error', text: response.error.message }); return false }
    setBankLedger((current) => current.map((entry) => entry.id === item.id ? response.data : entry))
    return true
  }



  const saveLedgerItem = async (event) => {
    event.preventDefault()
    if (!selectedAccountId) return
    const realizedAmount = Number(String(ledgerForm.realizedAmount || 0).replace(/[$,]/g, ''))
    const plannedAmount = Number(String(ledgerForm.plannedAmount || 0).replace(/[$,]/g, ''))
    if (!ledgerForm.date || !Number.isFinite(realizedAmount) || !Number.isFinite(plannedAmount)) return setNotice({ type: 'error', text: 'Enter a date and valid realized and planned amounts.' })
    setLedgerBusy(true)
    const ledgerAccountId = ledgerForm.accountId || selectedAccountId
    const values = { account_id: ledgerAccountId, description: ledgerForm.description.trim(), ledger_date: ledgerForm.date, cashflow_month: ledgerForm.cashflowMonth ? ledgerForm.cashflowMonth + '-01' : null, realized_amount: realizedAmount, planned_amount: plannedAmount, recurring: ledgerForm.recurring }
    const response = editingLedger ? await supabase.from('account_ledger_items').update(values).eq('id', editingLedger.id).select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').single() : await supabase.from('account_ledger_items').insert(values).select('id, account_id, description, ledger_date, realized_amount, planned_amount, recurring, recurrence_id, created_at').single()
    setLedgerBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setBankLedger((current) => editingLedger ? current.map((item) => item.id === response.data.id ? response.data : item) : [response.data, ...current])
    setLedgerForm(defaultLedgerForm(selectedAccountId))
    setEditingLedger(null)
    setLedgerFormOpen(false)
    setNotice({ type: 'success', text: editingLedger ? 'Ledger item updated.' : 'Ledger item added.' })
  }

  const openNewLedger = () => {
    setEditingLedger(null)
    setLedgerForm(defaultLedgerForm(selectedAccountId))
    setLedgerFormOpen(true)
  }

  const editLedgerItem = (item) => {
    if (!item) return
    setEditingLedger(item)
    setLedgerFormOpen(true)
    setLedgerForm({ accountId: item.account_id, description: item.description || '', date: item.ledger_date, cashflowMonth: item.cashflow_month ? item.cashflow_month.slice(0, 7) : '', realizedAmount: String(item.realized_amount), plannedAmount: String(item.planned_amount), recurring: item.recurring })
  }

  const deleteLedgerItem = async (item) => {
    if (!window.confirm('Delete this ledger item? This cannot be undone.')) return
    const response = await supabase.from('account_ledger_items').delete().eq('id', item.id)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setBankLedger((current) => current.filter((entry) => entry.id !== item.id))
    if (editingLedger?.id === item.id) { setEditingLedger(null); setLedgerForm(defaultLedgerForm(selectedAccountId)) }
    setNotice({ type: 'success', text: 'Ledger item deleted.' })
  }

  const copyRecurringLedger = async () => {
    if (!selectedAccountId) return
    const currentItems = bankLedger.filter((item) => item && item.account_id === selectedAccountId && item.ledger_date && item.ledger_date.slice(0, 7) === planMonth && item.recurring)
    if (!currentItems.length) return setNotice({ type: 'error', text: 'There are no recurring items in this month to copy.' })
    const nextItems = currentItems.map((item) => ({ account_id: selectedAccountId, description: item.description, ledger_date: nextMonthDate(item.ledger_date), cashflow_month: item.cashflow_month ? nextMonthDate(item.cashflow_month) : null, realized_amount: 0, planned_amount: Number(item.planned_amount) || Number(item.realized_amount) || 0, recurring: true, recurrence_id: item.recurrence_id }))
    const response = await supabase.from('account_ledger_items').upsert(nextItems, { onConflict: 'account_id,recurrence_id,ledger_date', ignoreDuplicates: true }).select('id, account_id, description, ledger_date, realized_amount, planned_amount, recurring, recurrence_id, created_at')
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setBankLedger((current) => [...current, ...(response.data || [])])
    setNotice({ type: 'success', text: 'Recurring items copied to the next month.' })
  }

  const loadActivityTransactions = async (filters = activityFilters) => {
    setActivityLoading(true)
    const hasFilters = Object.values(filters).some(Boolean)
    let query = supabase.from('card_transactions').select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at').order('transaction_date', { ascending: false }).order('created_at', { ascending: false })
    if (filters.name.trim()) query = query.ilike('name', '%' + filters.name.trim() + '%')
    if (filters.amount !== '') {
      const amount = Number(filters.amount)
      if (Number.isFinite(amount)) query = query.eq('amount', amount)
    }
    if (filters.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
    if (filters.dateTo) query = query.lte('transaction_date', filters.dateTo)
    if (filters.statementMonth) query = query.eq('statement_month', filters.statementMonth + '-01')
    if (filters.cashflowMonth) query = query.eq('cashflow_month', filters.cashflowMonth + '-01')
    if (filters.cardId) query = query.eq('card_id', filters.cardId)
    if (filters.category) query = query.eq('type', filters.category)
    if (!hasFilters) query = query.limit(10)
    const response = await query
    setActivityLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setActivityTransactions(response.data || [])
  }

  const bulkUpdateTransactions = async (ids, changes) => {
    if (!ids.length) return
    setNotice(null)
    const response = await supabase.from('card_transactions').update(changes).in('id', ids)
    if (response.error) { setNotice({ type: 'error', text: response.error.message }); return false }
    await Promise.all([loadActivityTransactions(), loadAllTransactions(), loadBankData()])
    setNotice({ type: 'success', text: ids.length + ' transaction' + (ids.length === 1 ? '' : 's') + ' updated.' })
    return true
  }

  const loadCategoryLimits = async () => {
    setLimitsLoading(true)
    const response = await supabase.from('category_limits').select('category, limit_amount')
    setLimitsLoading(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    const defaults = Object.fromEntries(TRANSACTION_TYPES.map((type) => [type.value, 1000]))
    for (const item of response.data || []) defaults[item.category] = Number(item.limit_amount)
    setCategoryLimits(defaults)
  }

  const saveCategoryLimits = async () => {
    if (!session?.user?.id) return
    setLimitsBusy(true)
    setNotice(null)
    const rows = SPEND_TYPES.map((type) => ({ user_id: session.user.id, category: type.value, limit_amount: Number(categoryLimits[type.value] || 0) }))
    const response = await supabase.from('category_limits').upsert(rows, { onConflict: 'user_id,category' })
    setLimitsBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setLimitsOpen(false)
    setNotice({ type: 'success', text: 'Monthly spend limits updated.' })
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
    const statementDay = normalizeStatementDay(cardStatementDay)
    const dueDay = normalizeStatementDay(cardDueDay)
    const defaultStatementMonth = formatIsoMonth(statementPeriods(statementDay, new Date()).currentDate)
    if (!name) return
    if (cardStatementDay !== '' && statementDay === null) return setNotice({ type: 'error', text: 'Statement date must be a day from 1 to 31, or blank.' })
    if (cardDueDay !== '' && dueDay === null) return setNotice({ type: 'error', text: 'Due date must be a day from 1 to 31, or blank.' })
    setCardBusy(true)
    setNotice(null)
    const nextOrder = cards.length ? Math.max(...cards.map((card) => card.sort_order)) + 1 : 0
    const response = await supabase.from('credit_cards').insert({ name, color: cardColor, default_category: cardDefaultCategory, statement_day: statementDay, due_day: dueDay, default_statement_month: defaultStatementMonth + '-01', sort_order: nextOrder }).select('id, name, color, default_category, statement_day, due_day, default_statement_month, sort_order, created_at').single()
    setCardBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => orderCardsByStatementDate([...current, response.data]))
    setCardName('')
    setCardColor(CARD_COLORS[0].value)
    setCardDefaultCategory('misc')
    setCardStatementDay('')
    setCardDueDay('')
    setAddCardOpen(false)
    setNotice({ type: 'success', text: 'Credit card added.' })
  }

  const openCard = (card) => {
    setSelectedCardId(card.id)
    setSelectedCardColor(card.color || CARD_COLORS[0].value)
    setSelectedCardDefaultCategory(card.default_category || 'misc')
    setSelectedCardStatementDay(card.statement_day ? String(card.statement_day) : '')
    setSelectedCardDueDay(card.due_day ? String(card.due_day) : '')
    const periods = statementPeriods(card.statement_day, new Date())
    const defaultStatementMonth = card.default_statement_month ? card.default_statement_month.slice(0, 7) : formatIsoMonth(periods.currentDate)
    setSelectedCardDefaultStatementMonth(defaultStatementMonth)
    setStatementMonthFilter(defaultStatementMonth)
    setStatementSearch('')
    setWorkspaceTab('add')
    setTransactionForm(defaultTransaction(card.default_category || 'misc', defaultStatementMonth))
    setNotice(null)
  }

  const closeCard = () => {
    setSelectedCardId(null)
    setPreferencesOpen(false)
    setTransactions([])
  }

  const saveCardColor = async () => {
    if (!selectedCard) return
    const statementDay = normalizeStatementDay(selectedCardStatementDay)
    const dueDay = normalizeStatementDay(selectedCardDueDay)
    if (selectedCardStatementDay !== '' && statementDay === null) return setNotice({ type: 'error', text: 'Statement date must be a day from 1 to 31, or blank.' })
    if (selectedCardDueDay !== '' && dueDay === null) return setNotice({ type: 'error', text: 'Due date must be a day from 1 to 31, or blank.' })
    setColorBusy(true)
    setNotice(null)
    const response = await supabase.from('credit_cards').update({ color: selectedCardColor, default_category: selectedCardDefaultCategory, statement_day: statementDay, due_day: dueDay }).eq('id', selectedCard.id)
    setColorBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => orderCardsByStatementDate(current.map((card) => card.id === selectedCard.id ? { ...card, color: selectedCardColor, default_category: selectedCardDefaultCategory, statement_day: statementDay, due_day: dueDay } : card)))
    setPreferencesOpen(false)
    setNotice({ type: 'success', text: 'Card preferences updated.' })
  }

  const saveDefaultStatementMonth = async () => {
    if (!selectedCard || !selectedCardDefaultStatementMonth) return
    setDefaultMonthBusy(true)
    setNotice(null)
    const response = await supabase.from('credit_cards').update({ default_statement_month: selectedCardDefaultStatementMonth + '-01' }).eq('id', selectedCard.id)
    setDefaultMonthBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setCards((current) => current.map((card) => card.id === selectedCard.id ? { ...card, default_statement_month: selectedCardDefaultStatementMonth + '-01' } : card))
    setTransactionForm((current) => ({ ...current, statementMonth: selectedCardDefaultStatementMonth }))
    setStatementMonthFilter(selectedCardDefaultStatementMonth)
    setNotice({ type: 'success', text: 'Default statement month updated.' })
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
    const name = String(transactionForm.name || '').trim()
    const date = transactionForm.date || formatIsoDate(new Date())
    const statementMonth = transactionForm.statementMonth || formatIsoMonth(new Date())
    const amount = Number(String(transactionForm.amount ?? '').replace(/[$,]/g, '').trim())
    if (!name || !date || !statementMonth || !Number.isFinite(amount)) {
      return setNotice({ type: 'error', text: 'Enter a name, date, statement month, and a valid dollar value.' })
    }
    setTransactionBusy(true)
    setNotice(null)
    const response = await supabase.from('card_transactions').insert({
      card_id: selectedCard.id,
      type: transactionForm.type,
      name,
      transaction_date: date,
      amount,
      statement_month: statementMonth + '-01',
      cashflow_month: transactionForm.cashflowMonth ? transactionForm.cashflowMonth + '-01' : null,
    }).select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at').single()
    setTransactionBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setTransactions((current) => [response.data, ...current])
    setAllTransactions((current) => [response.data, ...current])
    await loadBankData()
    setTransactionForm(defaultTransaction(selectedCard.default_category || 'misc', selectedCard.default_statement_month ? selectedCard.default_statement_month.slice(0, 7) : formatIsoMonth(statementPeriods(selectedCard.statement_day, new Date()).currentDate)))
    setNotice({ type: 'success', text: 'Transaction added to ' + selectedCard.name + '.' })
  }

  const openEditTransaction = (transaction) => {
    setEditingTransaction(transaction)
    setEditTransactionForm({ type: transaction.type, name: transaction.name, date: transaction.transaction_date, amount: String(transaction.amount), statementMonth: transaction.statement_month.slice(0, 7), cashflowMonth: transaction.cashflow_month ? transaction.cashflow_month.slice(0, 7) : formatIsoMonth(new Date()) })
    setNotice(null)
  }

  const changeEditTransaction = ({ target }) => setEditTransactionForm((current) => ({ ...current, [target.name]: target.value }))

  const saveTransaction = async (event) => {
    event.preventDefault()
    if (!editingTransaction) return
    const name = String(editTransactionForm.name || '').trim()
    const date = editTransactionForm.date || formatIsoDate(new Date())
    const statementMonth = editTransactionForm.statementMonth || formatIsoMonth(new Date())
    const amount = Number(String(editTransactionForm.amount ?? '').replace(/[$,]/g, '').trim())
    if (!name || !date || !statementMonth || !Number.isFinite(amount)) return setNotice({ type: 'error', text: 'Enter a name, date, statement month, and a valid dollar value.' })
    setEditBusy(true)
    setNotice(null)
    const response = await supabase.from('card_transactions').update({ type: editTransactionForm.type, name, transaction_date: date, amount, statement_month: statementMonth + '-01', cashflow_month: editTransactionForm.cashflowMonth ? editTransactionForm.cashflowMonth + '-01' : null }).eq('id', editingTransaction.id).select('id, card_id, type, name, transaction_date, amount, statement_month, cashflow_month, created_at').single()
    setEditBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions((current) => current.map((item) => item.id === response.data.id ? response.data : item))
    setTransactions((current) => current.map((item) => item.id === response.data.id ? response.data : item))
    await loadBankData()
    setEditingTransaction(null)
    await loadActivityTransactions()
    setNotice({ type: 'success', text: 'Transaction updated.' })
  }

  const deleteTransaction = async (transaction) => {
    if (!window.confirm('Delete ' + transaction.name + '? This cannot be undone.')) return
    const response = await supabase.from('card_transactions').delete().eq('id', transaction.id)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setAllTransactions((current) => current.filter((item) => item.id !== transaction.id))
    setTransactions((current) => current.filter((item) => item.id !== transaction.id))
    await loadBankData()
    if (editingTransaction?.id === transaction.id) setEditingTransaction(null)
    await loadActivityTransactions()
    setNotice({ type: 'success', text: 'Transaction deleted.' })
  }

  const planCardPayment = async ({ cardId, cardName, statementMonth, statementDay, accountId, amount }) => {
    if (!accountId) return setNotice({ type: 'error', text: 'Choose a bank account for this planned card payment.' })
    setPaymentBusy(true)
    setNotice(null)
    const existing = bankLedger.find((item) => item.source_type === 'card_payment' && item.card_id === cardId && item.statement_month?.slice(0, 7) === statementMonth)
    const values = { account_id: accountId, description: cardName + ' payment - ' + formatMonth(statementMonth + '-01'), ledger_date: statementPaymentDate(statementMonth, statementDay), realized_amount: 0, planned_amount: -Number(amount || 0), recurring: false, source_type: 'card_payment', card_id: cardId, statement_month: statementMonth + '-01' }
    const response = existing ? await supabase.from('account_ledger_items').update(values).eq('id', existing.id).select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').single() : await supabase.from('account_ledger_items').insert(values).select('id, account_id, description, ledger_date, cashflow_month, realized_amount, planned_amount, recurring, source_type, card_id, statement_month, recurrence_id, created_at').single()
    setPaymentBusy(false)
    if (response.error) return setNotice({ type: 'error', text: response.error.message })
    setBankLedger((current) => existing ? current.map((item) => item.id === response.data.id ? response.data : item) : [response.data, ...current])
    setNotice({ type: 'success', text: 'Planned card payment saved.' })
  }

  const selectedAccount = bankAccounts.find((account) => account.id === selectedAccountId) || null

  const navigateTo = (view) => {
    setActiveView(view)
    if (view === 'transactions') loadActivityTransactions()
  }

  if (loading) return <main className="page-shell"><p className="loading">Loading...</p></main>

  if (!session) return <main className="page-shell"><section className="card auth-card">
    <div className="brand-mark">BN</div><p className="eyebrow">Budget Nerd</p><h1>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1><p className="muted">A React and Supabase starter with secure email authentication.</p>
    <Form className="auth-form" onSubmit={submitAuth}><label htmlFor="email">Email</label><Form.Control id="email" name="email" type="email" autoComplete="email" value={credentials.email} onChange={changeCredentials} placeholder="you@example.com" required /><label htmlFor="password">Password</label><Form.Control id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={credentials.password} onChange={changeCredentials} placeholder="At least 6 characters" minLength={6} required /><Button type="submit" className="primary-button" disabled={busy}>{busy ? 'Working...' : mode === 'signup' ? 'Sign up' : 'Sign in'}</Button></Form>
    <Button className="link-button" type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setNotice(null) }}>{mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}</Button>{notice && <Notice notice={notice} />}
  </section></main>

  return <main className="app-shell"><Sidebar activeView={activeView} setActiveView={navigateTo} cardsCount={cards.length} email={session.user.email} signOut={signOut} /><section className={activeView === 'plan' ? 'content-shell plan-content-shell' : 'content-shell'}>
    {activeView === 'cards' ? <CardsView cards={cards} allTransactions={allTransactions} bankLedger={bankLedger} cardsLoading={cardsLoading} openCard={openCard} openAddCard={() => setAddCardOpen(true)} /> : activeView === 'transactions' ? <TransactionsView transactions={activityTransactions} cards={cards} loading={activityLoading} filters={activityFilters} setFilters={setActivityFilters} onSearch={(filters) => loadActivityTransactions(filters)} openEditTransaction={openEditTransaction} deleteTransaction={deleteTransaction} bulkUpdateTransactions={bulkUpdateTransactions} /> : activeView === 'spend' ? <SpendView transactions={allTransactions} limits={categoryLimits} month={spendMonth} setMonth={setSpendMonth} loading={allTransactionsLoading || limitsLoading} openLimits={() => setLimitsOpen(true)} /> : activeView === 'cashflow' ? <CashflowView month={cashflowMonth} setMonth={setCashflowMonth} transactions={allTransactions} ledger={bankLedger} accounts={bankAccounts} /> : activeView === 'settings' ? <SettingsView /> : activeView === 'plan' ? <PlanView accounts={bankAccounts} selectedAccount={selectedAccount} loading={bankLoading} openAddAccount={() => { setEditingAccount(null); setAddAccountOpen(true) }} openAccount={openBankAccount} closeAccount={() => { setSelectedAccountId(null); setEditingLedger(null) }} openTransfer={() => openTransfer(selectedAccount)} openNewLedger={() => { setEditingLedger(null); setLedgerForm(defaultLedgerForm(selectedAccount.id)); setLedgerFormOpen(true) }} openEditAccount={() => { setAccountForm({ name: selectedAccount.name, accountNumber: selectedAccount.account_number, routingNumber: selectedAccount.routing_number, startingBalance: String(selectedAccount.starting_balance), minimumBalance: String(selectedAccount.minimum_balance || 0), currency: selectedAccount.currency || 'USD' }); setEditingAccount(selectedAccount); setAddAccountOpen(true) }} ledgerMonth={planMonth} setLedgerMonth={setPlanMonth} changeLedgerForm={changeLedgerForm} ledgerForm={ledgerForm} swapLedgerAmounts={swapLedgerAmounts} updateLedgerAmountInline={updateLedgerAmountInline} swapLedgerItemAmounts={swapLedgerItemAmounts} saveLedgerItem={saveLedgerItem} ledgerBusy={ledgerBusy} editingLedger={editingLedger} editLedgerItem={editLedgerItem} deleteLedgerItem={deleteLedgerItem} copyRecurringLedger={copyRecurringLedger} cancelLedgerEdit={() => { setEditingLedger(null); setLedgerForm(defaultLedgerForm()) }} ledger={bankLedger} /> : <DashboardView session={session} protectedCheck={protectedCheck} protectedBusy={protectedBusy} result={result} />}
    {notice && <Notice notice={notice} />}
  </section>{selectedCard && <CardDetailModal card={selectedCard} statementSummary={statementSummary(selectedCard, allTransactions, bankLedger)} bankAccounts={bankAccounts} bankLedger={bankLedger} planCardPayment={planCardPayment} paymentBusy={paymentBusy} selectedCardDefaultStatementMonth={selectedCardDefaultStatementMonth} setSelectedCardDefaultStatementMonth={setSelectedCardDefaultStatementMonth} saveDefaultStatementMonth={saveDefaultStatementMonth} defaultMonthBusy={defaultMonthBusy} workspaceTab={workspaceTab} setWorkspaceTab={setWorkspaceTab} statementMonthFilter={statementMonthFilter} setStatementMonthFilter={setStatementMonthFilter} statementSearch={statementSearch} setStatementSearch={setStatementSearch} openPreferences={() => setPreferencesOpen(true)} closeCard={closeCard} transactions={transactions} transactionsLoading={transactionsLoading} transactionForm={transactionForm} changeTransaction={changeTransaction} addTransaction={addTransaction} transactionBusy={transactionBusy} transactionSuggestions={transactionSuggestions} openEditTransaction={openEditTransaction} deleteTransaction={deleteTransaction} />}{selectedCard && preferencesOpen && <CardPreferencesModal card={selectedCard} selectedCardColor={selectedCardColor} setSelectedCardColor={setSelectedCardColor} selectedCardDueDay={selectedCardDueDay} setSelectedCardDueDay={setSelectedCardDueDay} selectedCardDefaultCategory={selectedCardDefaultCategory} setSelectedCardDefaultCategory={setSelectedCardDefaultCategory} selectedCardStatementDay={selectedCardStatementDay} setSelectedCardStatementDay={setSelectedCardStatementDay} saveCardColor={saveCardColor} colorBusy={colorBusy} close={() => setPreferencesOpen(false)} />}{addCardOpen && <AddCardModal cardName={cardName} setCardName={setCardName} cardColor={cardColor} setCardColor={setCardColor} cardDefaultCategory={cardDefaultCategory} setCardDefaultCategory={setCardDefaultCategory} cardDueDay={cardDueDay} setCardDueDay={setCardDueDay} cardStatementDay={cardStatementDay} setCardStatementDay={setCardStatementDay} cardBusy={cardBusy} addCard={addCard} close={() => setAddCardOpen(false)} />}{ledgerFormOpen && selectedAccount && <LedgerItemModal accounts={bankAccounts} account={selectedAccount} form={ledgerForm} changeForm={changeLedgerForm} save={saveLedgerItem} busy={ledgerBusy} editing={editingLedger} cancel={() => { setLedgerFormOpen(false); setEditingLedger(null) }} swapAmounts={swapLedgerAmounts} />}
{transferOpen && <TransferModal accounts={bankAccounts} form={transferForm} setForm={setTransferForm} save={saveTransfer} busy={transferBusy} close={() => setTransferOpen(false)} />}{addAccountOpen && <AddBankAccountModal form={accountForm} setForm={setAccountForm} editingAccount={editingAccount} save={saveBankAccount} busy={accountBusy} close={() => { setEditingAccount(null); setAddAccountOpen(false) }} />}{limitsOpen && <SpendLimitsModal limits={categoryLimits} setLimits={setCategoryLimits} save={saveCategoryLimits} busy={limitsBusy} close={() => setLimitsOpen(false)} />}{editingTransaction && <TransactionEditModal transaction={editingTransaction} form={editTransactionForm} suggestions={editTransactionSuggestions} changeForm={changeEditTransaction} save={saveTransaction} remove={deleteTransaction} busy={editBusy} close={() => setEditingTransaction(null)} />}</main>
}

function Sidebar({ activeView, setActiveView, cardsCount, email, signOut }) {
  return <aside className="sidebar"><div className="sidebar-brand"><div className="brand-mark">BN</div><span>Budget Nerd</span></div><Nav className="side-nav" aria-label="Main navigation"><Nav.Link as="button" type="button" className={activeView === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('dashboard')}><span>⌂</span>Dashboard</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'cards' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('cards')}><span>▣</span>Cards</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'transactions' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('transactions')}><span>↔</span>Transactions</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'spend' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('spend')}><span>◔</span>Spend</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'plan' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('plan')}><span>▤</span>Plan</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'cashflow' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('cashflow')}><span>⌁</span>Cashflow</Nav.Link><Nav.Link as="button" type="button" className={activeView === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveView('settings')}><span>⚙</span>Settings</Nav.Link></Nav><div className="sidebar-footer"><p className="sidebar-email" title={email}>{email}</p><Button className="nav-signout" onClick={signOut}>Sign out</Button></div></aside>
}

function accountBalances(account, ledger) {
  const safeLedger = (ledger || []).filter(Boolean)
  const current = Number(account.starting_balance || 0) + safeLedger.reduce((sum, item) => sum + Number(item.realized_amount || 0), 0)
  return { current, predicted: current + safeLedger.reduce((sum, item) => sum + Number(item.planned_amount || 0), 0) }
}

function maskAccountNumber(value) { const text = String(value || ''); return text.length > 4 ? '•••• ' + text.slice(-4) : text }
function statementPaymentDate(statementMonth, statementDay) {
  const month = parseMonth(statementMonth)
  const day = statementDay ? Number(statementDay) : 1
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const statementDate = new Date(month.getFullYear(), month.getMonth(), Math.min(day, lastDay))
  statementDate.setDate(statementDate.getDate() + 1)
  return formatIsoDate(statementDate)
}

function nextMonthDate(value) { const date = parseDate(value); const day = date.getDate(); const next = new Date(date.getFullYear(), date.getMonth() + 1, 1); const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(); return formatIsoDate(new Date(next.getFullYear(), next.getMonth(), Math.min(day, lastDay))) }

function PlanView({ accounts, ledger, selectedAccount, loading, openAddAccount, openAccount, openTransfer, openNewLedger, closeAccount, openEditAccount, ledgerMonth, setLedgerMonth, changeLedgerForm, ledgerForm, swapLedgerAmounts, updateLedgerAmountInline, swapLedgerItemAmounts, saveLedgerItem, ledgerBusy, editingLedger, editLedgerItem, deleteLedgerItem, copyRecurringLedger, cancelLedgerEdit }) {
  const activeKey = selectedAccount?.id || accounts[0]?.id
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Financial plan</p><h1>Plan</h1><p className="muted">Manage bank accounts, balances, and monthly ledger plans.</p></div><Button variant="primary" className="plan-add-account-trigger" onClick={openAddAccount}>Add bank account</Button></div>{loading ? <p className="loading">Loading accounts...</p> : accounts.length === 0 ? <section className="empty-state"><div className="empty-icon">▤</div><h2>No bank accounts yet</h2><p className="muted">Add an account to start planning balances and ledger activity.</p><Button variant="primary" className="plan-add-account-trigger" onClick={openAddAccount}>Add bank account</Button></section> : <Tabs activeKey={activeKey} onSelect={(key) => { const account = accounts.find((item) => item.id === key); if (account) openAccount(account) }}>{accounts.map((account) => <Tab eventKey={account.id} title={account.name} key={account.id}><BankAccountWorkspace accounts={accounts} account={account} ledger={ledger.filter((item) => item.account_id === account.id)} month={ledgerMonth} setMonth={setLedgerMonth} openEditAccount={openEditAccount} openTransfer={openTransfer} openNewLedger={openNewLedger} ledgerForm={ledgerForm} changeLedgerForm={changeLedgerForm} swapLedgerAmounts={swapLedgerAmounts} updateLedgerAmountInline={updateLedgerAmountInline} swapLedgerItemAmounts={swapLedgerItemAmounts} saveLedgerItem={saveLedgerItem} ledgerBusy={ledgerBusy} editingLedger={editingLedger} editLedgerItem={editLedgerItem} deleteLedgerItem={deleteLedgerItem} copyRecurringLedger={copyRecurringLedger} cancelLedgerEdit={cancelLedgerEdit} close={closeAccount} /></Tab>)}</Tabs>}</div>
}

function LedgerItemModal({ accounts, account, form, changeForm, save, busy, editing, cancel, swapAmounts }) {
  return <Modal show onHide={cancel} centered size="lg"><Modal.Header closeButton><Modal.Title>{editing ? 'Edit ledger item' : 'Add ledger item'}</Modal.Title></Modal.Header><Modal.Body><Form onSubmit={save}><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-account">Bank account</Form.Label><Form.Select id="ledger-modal-account" name="accountId" value={form.accountId || account.id} onChange={changeForm}>{accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Form.Select></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-description">Description</Form.Label><Form.Control id="ledger-modal-description" name="description" value={form.description} onChange={changeForm} placeholder="e.g. Rent" maxLength={120} /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-date">Date</Form.Label><DatePicker id="ledger-modal-date" selected={parseDate(form.date)} onChange={(date) => changeForm({ target: { name: 'date', value: formatIsoDate(date) } })} onChangeRaw={(event) => { const parsed = parseUserDate(event?.target?.value || ''); if (parsed) changeForm({ target: { name: 'date', value: formatIsoDate(parsed) } }) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="M/D or M/D/YYYY" customInput={<Form.Control />} required /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-cashflow">Cashflow month (optional)</Form.Label><DatePicker id="ledger-modal-cashflow" selected={parseMonth(form.cashflowMonth)} onChange={(date) => changeForm({ target: { name: 'cashflowMonth', value: formatIsoMonth(date) } })} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} isClearable /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-realized">Realized amount</Form.Label><InputGroup><InputGroup.Text>{currencySymbol(account.currency)}</InputGroup.Text><Form.Control id="ledger-modal-realized" name="realizedAmount" type="number" step="0.01" value={form.realizedAmount} onChange={changeForm} placeholder="0.00" /></InputGroup></Form.Group><Button type="button" variant="outline-secondary" size="sm" className="ledger-swap-button" onClick={swapAmounts}>⇄ Swap realized/planned</Button><Form.Group className="mb-3"><Form.Label htmlFor="ledger-modal-planned">Planned amount</Form.Label><InputGroup><InputGroup.Text>{currencySymbol(account.currency)}</InputGroup.Text><Form.Control id="ledger-modal-planned" name="plannedAmount" type="number" step="0.01" value={form.plannedAmount} onChange={changeForm} placeholder="0.00" /></InputGroup></Form.Group><Form.Check id="ledger-modal-recurring" name="recurring" type="checkbox" label="Recurring item" checked={form.recurring} onChange={changeForm} /><div className="d-flex justify-content-end gap-2 mt-4"><Button type="button" variant="outline-secondary" onClick={cancel}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save changes' : 'Add ledger item'}</Button></div></Form></Modal.Body></Modal>
}

function TransferModal({ accounts, form, setForm, save, busy, close }) {
  const source = accounts.find((account) => account.id === form.sourceAccountId)
  const destinations = accounts.filter((account) => account.id !== form.sourceAccountId && (account.currency || 'USD') === (source?.currency || 'USD'))
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title>Transfer between accounts</Modal.Title></Modal.Header><Modal.Body><Form onSubmit={save}><Form.Group className="mb-3"><Form.Label>From</Form.Label><Form.Control value={source?.name || ''} readOnly /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="transfer-destination">To</Form.Label><Form.Select id="transfer-destination" value={form.destinationAccountId} onChange={(event) => update('destinationAccountId', event.target.value)} required><option value="">Choose destination</option>{destinations.map((account) => <option value={account.id} key={account.id}>{account.name} ({account.currency || 'USD'})</option>)}</Form.Select></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="transfer-description">Description</Form.Label><Form.Control id="transfer-description" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={120} /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="transfer-kind">Transfer type</Form.Label><Form.Select id="transfer-kind" value={form.kind} onChange={(event) => update('kind', event.target.value)}><option value="realized">Realized transfer</option><option value="planned">Planned transfer</option></Form.Select></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="transfer-date">Date</Form.Label><DatePicker id="transfer-date" selected={parseDate(form.date)} onChange={(date) => update('date', formatIsoDate(date))} onChangeRaw={(event) => { const parsed = parseUserDate(event?.target?.value || ''); if (parsed) update('date', formatIsoDate(parsed)) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="M/D or M/D/YYYY" customInput={<Form.Control />} required /></Form.Group><Form.Group><Form.Label htmlFor="transfer-amount">Amount ({currencySymbol(source?.currency)})</Form.Label><InputGroup><InputGroup.Text>{currencySymbol(source?.currency)}</InputGroup.Text><Form.Control id="transfer-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update('amount', event.target.value)} required /></InputGroup></Form.Group>{destinations.length === 0 && <Alert variant="warning" className="mt-3 mb-0">Add another bank account with the same currency before creating a transfer.</Alert>}<Button type="submit" variant="primary" className="w-100 mt-4" disabled={busy || destinations.length === 0}>{busy ? 'Saving...' : 'Record transfer'}</Button></Form></Modal.Body></Modal>
}

function AddBankAccountModal({ form, setForm, editingAccount, save, busy, close }) {
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title>{editingAccount ? 'Edit bank details' : 'Add bank account'}</Modal.Title></Modal.Header><Modal.Body><Form onSubmit={save}><Form.Group className="mb-3"><Form.Label htmlFor="bank-account-name">Account name</Form.Label><Form.Control id="bank-account-name" value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Main checking" maxLength={100} required /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="bank-account-number">Account number</Form.Label><Form.Control id="bank-account-number" type="text" inputMode="numeric" autoComplete="off" value={form.accountNumber} onChange={(event) => update('accountNumber', event.target.value)} required /></Form.Group><Form.Group className="mb-3"><Form.Label htmlFor="bank-routing-number">Routing number</Form.Label><Form.Control id="bank-routing-number" type="text" inputMode="numeric" autoComplete="off" value={form.routingNumber} onChange={(event) => update('routingNumber', event.target.value)} required /></Form.Group><Form.Group><Form.Label htmlFor="bank-starting-balance">Starting balance</Form.Label><InputGroup><InputGroup.Text>$</InputGroup.Text><Form.Control id="bank-starting-balance" type="number" step="0.01" value={form.startingBalance} onChange={(event) => update('startingBalance', event.target.value)} placeholder="0.00" required /></InputGroup></Form.Group><Form.Group className="mt-3"><Form.Label htmlFor="bank-minimum-balance">Minimum balance</Form.Label><InputGroup><InputGroup.Text>$</InputGroup.Text><Form.Control id="bank-minimum-balance" type="number" step="0.01" value={form.minimumBalance} onChange={(event) => update('minimumBalance', event.target.value)} placeholder="0.00" /></InputGroup></Form.Group><Form.Group className="mt-3"><Form.Label htmlFor="bank-currency">Currency</Form.Label><Form.Select id="bank-currency" value={form.currency} onChange={(event) => update('currency', event.target.value)}>{ACCOUNT_CURRENCIES.map((currencyOption) => <option value={currencyOption.code} key={currencyOption.code}>{currencyOption.code} — {currencyOption.label}</option>)}</Form.Select></Form.Group><Alert variant="warning" className="mt-3 mb-0">Account and routing numbers are sensitive financial data. Store them only if you understand your database access and security requirements.</Alert><Button type="submit" variant="primary" className="w-100 mt-4" disabled={busy}>{busy ? 'Saving...' : editingAccount ? 'Save bank details' : 'Add account'}</Button></Form></Modal.Body></Modal>
}

function BankAccountWorkspace({ accounts, account, ledger, month, setMonth, openEditAccount, openTransfer, openNewLedger, updateLedgerAmountInline, swapLedgerItemAmounts, ledgerForm, changeLedgerForm, swapLedgerAmounts, saveLedgerItem, ledgerBusy, editingLedger, editLedgerItem, deleteLedgerItem, copyRecurringLedger, cancelLedgerEdit, close }) {
  const [ledgerSortDirection, setLedgerSortDirection] = useState('newest')
  const [ledgerAmountFilter, setLedgerAmountFilter] = useState('')
  const [ledgerDescriptionFilter, setLedgerDescriptionFilter] = useState('')
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all')
  const [ledgerSignFilter, setLedgerSignFilter] = useState('all')
  const [inlineAmountEdit, setInlineAmountEdit] = useState(null)
  const safeLedger = ledger.filter(Boolean)
  const balances = accountBalances(account, safeLedger)
  const chronologicalMonthItems = safeLedger.filter((item) => item.ledger_date && item.ledger_date.slice(0, 7) === month).sort((left, right) => left.ledger_date.localeCompare(right.ledger_date) || String(left.created_at).localeCompare(String(right.created_at)))
  const monthItems = [...chronologicalMonthItems].sort((left, right) => { const dateOrder = left.ledger_date.localeCompare(right.ledger_date); const createdOrder = String(left.created_at).localeCompare(String(right.created_at)); const order = dateOrder || createdOrder; return ledgerSortDirection === 'newest' ? -order : order })
  const amountQuery = ledgerAmountFilter.trim()
  const descriptionQuery = ledgerDescriptionFilter.trim().toLowerCase()
  const filteredMonthItems = monthItems.filter((item) => { const realized = Number(item.realized_amount || 0); const planned = Number(item.planned_amount || 0); const net = realized + planned; const typeMatches = ledgerTypeFilter === 'all' || (ledgerTypeFilter === 'realized' ? realized !== 0 : planned !== 0); const signMatches = ledgerSignFilter === 'all' || (ledgerSignFilter === 'positive' ? net > 0 : net < 0); const amountMatches = !amountQuery || [realized, planned, net].some((amount) => String(amount).includes(amountQuery)); const descriptionMatches = !descriptionQuery || (item.description || '').toLowerCase().includes(descriptionQuery); return typeMatches && signMatches && amountMatches && descriptionMatches })
  let runningBalance = Number(account.starting_balance || 0)
  const runningBalances = new Map()
  ;[...safeLedger].sort((left, right) => left.ledger_date.localeCompare(right.ledger_date) || String(left.created_at).localeCompare(String(right.created_at))).forEach((item) => { runningBalance += Number(item.realized_amount || 0) + Number(item.planned_amount || 0); runningBalances.set(item.id, runningBalance) })
  const firstMonthItem = chronologicalMonthItems[0]
  const openingBalance = firstMonthItem ? runningBalances.get(firstMonthItem.id) - Number(firstMonthItem.realized_amount || 0) - Number(firstMonthItem.planned_amount || 0) : Number(account.starting_balance || 0)
  const ledgerGroups = filteredMonthItems.reduce((groups, item) => { (groups[item.ledger_date] ||= []).push(item); return groups }, {})
  const minimumBalance = Number(account.minimum_balance || 0)
  return <div className="plan-account-workspace"><section className="content-card plan-account-details"><div className="account-workspace-header"><div><div className="account-title-row"><h2>{account.name}</h2></div><p className="muted">{maskAccountNumber(account.account_number)}</p></div><div className="d-flex gap-2"><Button variant="outline-primary" onClick={openEditAccount}>Edit</Button><Button variant="outline-primary" onClick={openTransfer}>Transfer</Button><Button variant="outline-secondary" onClick={close}>Close</Button></div></div>{balances.predicted < minimumBalance && <Alert variant="danger">Predicted balance {formatAccountAmount(account.currency, balances.predicted)} is below the minimum balance of {formatAccountAmount(account.currency, minimumBalance)}.</Alert>}<div className="account-modal-summary"><div><small>Current</small><strong>{formatAccountAmount(account.currency, balances.current)}</strong></div><div><small>Predicted</small><strong>{formatAccountAmount(account.currency, balances.predicted)}</strong></div><div><small>Minimum</small><strong>{formatAccountAmount(account.currency, minimumBalance)}</strong></div></div></section><section className="content-card plan-ledger-card"><div className="plan-month-toolbar"><DatePicker selected={parseMonth(month)} onChange={(date) => { if (date) setMonth(formatIsoMonth(date)) }} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} /><div className="ledger-toolbar-actions"><ButtonGroup className="ledger-sort-toggle" aria-label="Ledger date sort"><Button type="button" variant={ledgerSortDirection === 'newest' ? 'primary' : 'outline-secondary'} title="Newest first" aria-label="Newest first" onClick={() => setLedgerSortDirection('newest')}>↓</Button><Button type="button" variant={ledgerSortDirection === 'oldest' ? 'primary' : 'outline-secondary'} title="Oldest first" aria-label="Oldest first" onClick={() => setLedgerSortDirection('oldest')}>↑</Button></ButtonGroup><Button variant="primary" onClick={openNewLedger}>Add ledger item</Button><Button variant="outline-primary" onClick={copyRecurringLedger}>Copy recurring to next month</Button></div></div><div className="ledger-filters"><Form.Control value={ledgerDescriptionFilter} onChange={(event) => setLedgerDescriptionFilter(event.target.value)} placeholder="Filter description" aria-label="Filter ledger description" /><Form.Control value={ledgerAmountFilter} onChange={(event) => setLedgerAmountFilter(event.target.value)} placeholder="Filter amount" aria-label="Filter ledger amount" /><ButtonGroup aria-label="Ledger type filter"><Button variant={ledgerTypeFilter === 'all' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerTypeFilter('all')}>All</Button><Button variant={ledgerTypeFilter === 'planned' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerTypeFilter('planned')}>Planned</Button><Button variant={ledgerTypeFilter === 'realized' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerTypeFilter('realized')}>Realized</Button></ButtonGroup><ButtonGroup aria-label="Ledger sign filter"><Button variant={ledgerSignFilter === 'all' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerSignFilter('all')}>All</Button><Button variant={ledgerSignFilter === 'positive' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerSignFilter('positive')}>Positive</Button><Button variant={ledgerSignFilter === 'negative' ? 'primary' : 'outline-secondary'} onClick={() => setLedgerSignFilter('negative')}>Negative</Button></ButtonGroup></div><div className="history-heading"><h3>{formatMonth(month + '-01')}</h3><span>{filteredMonthItems.length}</span></div>{filteredMonthItems.length === 0 ? <p className="muted">No ledger items match these filters.</p> : <div className="ledger-date-groups"><div className="ledger-opening-balance">Opening balance {formatAccountAmount(account.currency, openingBalance)}</div>{Object.entries(ledgerGroups).sort(([left], [right]) => ledgerSortDirection === 'newest' ? right.localeCompare(left) : left.localeCompare(right)).map(([date, items]) => <div className="ledger-date-group" key={date}><h4>{formatDate(date)}</h4><div className="transaction-list">{items.map((item) => { const realizedAmount = Number(item.realized_amount || 0); const plannedAmount = Number(item.planned_amount || 0); const rowType = realizedAmount !== 0 ? (plannedAmount !== 0 ? 'mixed' : 'realized') : 'planned'; const netAmount = realizedAmount + plannedAmount; const amountDirection = netAmount > 0 ? 'positive' : netAmount < 0 ? 'negative' : 'neutral'; const balanceAfter = runningBalances.get(item.id) ?? account.starting_balance; const belowMinimum = balanceAfter < minimumBalance; const negativeBalance = balanceAfter < 0; const moveIcon = realizedAmount !== 0 && plannedAmount === 0 ? '→' : plannedAmount !== 0 && realizedAmount === 0 ? '←' : '⇄'; return <div className="ledger-item-sequence" key={item.id}><div className={'ledger-row ' + rowType + ' amount-' + amountDirection + (belowMinimum ? ' below-minimum' : '')}><div className="ledger-row-main"><strong>{item.description || 'Ledger item'}</strong><small>{item.recurring ? 'Recurring' : rowType === 'planned' ? 'Planned' : 'Realized'}</small></div><div className="ledger-amounts">{realizedAmount !== 0 ? <InlineLedgerAmount item={item} field="realized_amount" currency={account.currency} editing={inlineAmountEdit} setEditing={setInlineAmountEdit} update={updateLedgerAmountInline} /> : <span className="ledger-amount-placeholder" />}<Button type="button" className="ledger-swap-icon" variant="outline-secondary" title="Move amount between realized and planned" aria-label="Move amount between realized and planned" disabled={realizedAmount === 0 && plannedAmount === 0} onClick={() => swapLedgerItemAmounts(item)}>{moveIcon}</Button>{plannedAmount !== 0 ? <InlineLedgerAmount item={item} field="planned_amount" currency={account.currency} editing={inlineAmountEdit} setEditing={setInlineAmountEdit} update={updateLedgerAmountInline} /> : <span className="ledger-amount-placeholder" />}</div><div className="transaction-row-actions"><Button size="sm" variant="outline-primary" onClick={() => editLedgerItem(item)}>Edit</Button><Button size="sm" variant="outline-danger" onClick={() => deleteLedgerItem(item)}>Delete</Button></div></div><div className={negativeBalance ? 'ledger-balance-divider negative' : 'ledger-balance-divider'}>Balance {formatAccountAmount(account.currency, runningBalances.get(item.id))}</div></div>})}</div></div>)}</div>}</section></div>}

function InlineLedgerAmount({ item, field, currency, editing, setEditing, update }) {
  const isEditing = editing?.id === item.id && editing?.field === field
  const value = item[field]
  const save = async (nextValue) => { const success = await update(item, field, nextValue ?? editing?.value ?? ''); if (success) setEditing(null) }
  if (isEditing) return <Form.Control className={field === 'realized_amount' ? 'inline-ledger-input realized-ledger-amount' : 'inline-ledger-input planned-ledger-amount'} size="sm" type="number" step="0.01" autoFocus value={editing.value} onChange={(event) => setEditing((current) => ({ ...current, value: event.target.value }))} onBlur={(event) => save(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); save(event.currentTarget.value) } if (event.key === 'Escape') setEditing(null) }} />
  return <strong className={field === 'realized_amount' ? 'inline-ledger-amount realized-ledger-amount' : 'inline-ledger-amount planned-ledger-amount'} title="Double-click to edit" onDoubleClick={() => setEditing({ id: item.id, field, value: String(value ?? 0) })}>{formatAccountAmount(currency, value)}</strong>
}

function SettingsView() {
  const [keys, setKeys] = useState([])
  const [name, setName] = useState('')
  const [revealedKey, setRevealedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endpoint = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/api-keys'
  const curlExample = [
    'curl -X POST "$VITE_SUPABASE_URL/functions/v1/transactions-api" \\\\',
    '  -H "Authorization: Bearer bn_live_your_key" \\\\',
    '  -H "Content-Type: application/json" \\\\',
    '  -d \'{"card_name":"Everyday Rewards","type":"grocery","name":"Market","date":"2026-10-06","amount":42.50}\''
  ].join('\\n')


  const request = async (method, body) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Please sign in again before managing API keys.')
    const response = await fetch(endpoint, { method, headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || 'API key request failed.')
    return result
  }

  const loadKeys = async () => {
    try { const result = await request('GET'); setKeys(result.keys || []) } catch (caught) { setError(caught.message) } finally { setLoading(false) }
  }
  useEffect(() => { loadKeys() }, [])

  const createKey = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true); setError(''); setRevealedKey('')
    try { const result = await request('POST', { name: name.trim() }); setKeys((current) => [result.record, ...current]); setRevealedKey(result.key); setName('') } catch (caught) { setError(caught.message) } finally { setBusy(false) }
  }
  const revokeKey = async (id) => {
    if (!window.confirm('Revoke this API key? Existing integrations will stop working.')) return
    try { await request('PATCH', { id }); setKeys((current) => current.map((key) => key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key)) } catch (caught) { setError(caught.message) }
  }

  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Account</p><h1>Settings</h1><p className="muted">Manage write-only API keys for importing transactions from trusted tools.</p></div></div><section className="content-card settings-section"><p className="eyebrow">Transaction API keys</p><h2>Create an import key</h2><p className="muted">Keys can add transactions only. They cannot read, edit, or delete your data.</p><Form onSubmit={createKey} className="api-key-create-form"><Form.Control value={name} onChange={(event) => setName(event.target.value)} placeholder="Key name, e.g. Bank CSV importer" maxLength={80} required /><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Creating...' : 'Create API key'}</Button></Form>{error && <Alert variant="danger" className="mt-3">{error}</Alert>}{revealedKey && <Alert variant="success" className="mt-3"><strong>Copy this key now.</strong> It will not be shown again.<Form.Control className="mt-2" readOnly value={revealedKey} onFocus={(event) => event.target.select()} /></Alert>}</section><section className="content-card settings-section"><div className="history-heading"><h2>Your API keys</h2><span>{keys.length}</span></div>{loading ? <p className="muted">Loading keys...</p> : keys.length === 0 ? <p className="muted">No API keys created.</p> : <div className="api-key-list">{keys.map((key) => <div className="api-key-row" key={key.id}><div><strong>{key.name}</strong><small>{key.key_prefix}•••• · Created {formatDate(key.created_at.slice(0, 10))}{key.revoked_at ? ' · Revoked' : ''}</small></div>{key.revoked_at ? <span className="text-muted">Revoked</span> : <Button size="sm" variant="outline-danger" onClick={() => revokeKey(key.id)}>Revoke</Button>}</div>)}</div>}</section><section className="content-card settings-section"><p className="eyebrow">API usage</p><h2>Import transactions with curl</h2><p className="muted">Use the URL below with an API key created above. Replace the placeholders with your values.</p><pre className="api-example">{curlExample}</pre></section></div>
}

function CashflowView({ month, setMonth, transactions, ledger, accounts }) {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]))
  const linksByKey = new Map()
  const addLink = (source, target, value) => { if (!value) return; const key = source + '::' + target; linksByKey.set(key, (linksByKey.get(key) || 0) + Math.abs(Number(value))) }
  transactions.filter((transaction) => transaction.cashflow_month?.slice(0, 7) === month).forEach((transaction) => { const category = transactionType(transaction.type).emoji + ' ' + transactionType(transaction.type).label; const amount = Number(transaction.amount || 0); if (amount >= 0) addLink('Cashflow', 'Out: ' + category, amount); else addLink('In: ' + category, 'Cashflow', amount) })
  ledger.filter((item) => item.cashflow_month?.slice(0, 7) === month).forEach((item) => { const amount = Number(item.realized_amount || 0) + Number(item.planned_amount || 0); const accountName = accountNames.get(item.account_id) || 'Bank account'; const label = accountName + ' · ' + (item.description || 'Ledger item'); if (amount >= 0) addLink('In: ' + label, 'Cashflow', amount); else addLink('Cashflow', 'Out: ' + label, amount) })
  const links = [...linksByKey.entries()].map(([key, value]) => { const [source, target] = key.split('::'); return { source, target, value } })
  const incomingTotal = links.filter((link) => link.target === 'Cashflow').reduce((sum, link) => sum + link.value, 0)
  const outgoingTotal = links.filter((link) => link.source === 'Cashflow').reduce((sum, link) => sum + link.value, 0)
  const rawNodeIds = [...new Set(links.flatMap((link) => [link.source, link.target]))]
  const nodeIdByRaw = new Map()
  const nodes = rawNodeIds.map((id) => { const incoming = id.startsWith('In: '); const outgoing = id.startsWith('Out: '); const total = incoming ? links.filter((link) => link.source === id).reduce((sum, link) => sum + link.value, 0) : outgoing ? links.filter((link) => link.target === id).reduce((sum, link) => sum + link.value, 0) : Math.max(incomingTotal, outgoingTotal); const baseLabel = id.replace(/^(In|Out): /, ''); const percentage = incoming ? (incomingTotal > 0 ? Math.round((total / incomingTotal) * 100) : 0) : (outgoing ? (outgoingTotal > 0 ? Math.round((total / outgoingTotal) * 100) : 0) : 0); const nodeId = id === 'Cashflow' ? id : baseLabel + (incoming ? '\u200b' : '\u200c'); nodeIdByRaw.set(id, nodeId); return { id: nodeId, flowAmount: total, label: baseLabel + ' · ' + formatPlainAmount(total) + ' (' + percentage + '%)' } }).sort((left, right) => right.flowAmount - left.flowAmount)
  const sankeyLinks = links.map((link) => ({ ...link, source: nodeIdByRaw.get(link.source) || link.source, target: nodeIdByRaw.get(link.target) || link.target }))
  const monthName = parseMonth(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const sankeyData = { nodes, links: sankeyLinks }
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Money movement</p><h1>Cashflow</h1><p className="muted">Visualize transactions and ledger entries assigned to a cashflow month.</p></div><DatePicker selected={parseMonth(month)} onChange={(date) => { if (date) setMonth(formatIsoMonth(date)) }} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} /></div><section className="content-card cashflow-summary"><strong>{monthName}</strong><span>{links.length ? formatPlainAmount(incomingTotal) + ' in · ' + formatPlainAmount(outgoingTotal) + ' out' : 'No cashflow items assigned'}</span></section>{links.length === 0 ? <section className="empty-state"><div className="empty-icon">⌁</div><h2>No cashflow data</h2><p className="muted">Assign a cashflow month to transactions or ledger entries to include them here.</p></section> : <section className="content-card cashflow-chart"><ResponsiveSankey data={sankeyData} margin={{ top: 24, right: 180, bottom: 24, left: 180 }} align="justify" colors={{ scheme: 'category10' }} nodeOpacity={1} nodeHoverOthersOpacity={0.35} nodeSort="input" nodeThickness={18} nodeSpacing={18} nodeBorderWidth={0} nodeLabel="label" labelPosition="outside" labelOrientation="horizontal" labelPadding={8} labelTextColor="var(--bs-body-color)" linkColor={{ from: 'color' }} linkOpacity={0.85} linkHoverOthersOpacity={0.2} enableLinkGradient={false} nodeTooltip={({ node }) => <div className="cashflow-tooltip"><strong>{node.data?.label || node.label || node.id}</strong><span>{formatPlainAmount(node.value)}</span></div>} linkTooltip={({ link }) => <div className="cashflow-tooltip"><strong>{link.source.id} → {link.target.id}</strong><span>{formatPlainAmount(link.value)}</span></div>} /></section>}<details className="cashflow-debug"><summary>Show Sankey data</summary><pre>{JSON.stringify({ month, nodes, links: sankeyLinks }, null, 2)}</pre></details></div>
}

function SpendView({ transactions, limits, month, setMonth, loading, openLimits }) {
  const now = new Date()
  const selectedDate = parseMonth(month)
  const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
  const monthProgress = monthElapsedPercent(month, now)
  const monthTransactions = transactions.filter((transaction) => transaction.transaction_date?.slice(0, 7) === month)
  const monthName = selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const trackedSpend = SPEND_TYPES.reduce((total, type) => total + monthTransactions.filter((transaction) => transaction.type === type.value).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0), 0)
  const trackedLimit = SPEND_TYPES.reduce((total, type) => total + Number(limits[type.value] ?? 1000), 0)
  const trackedPercentage = trackedLimit > 0 ? (trackedSpend / trackedLimit) * 100 : 0
  const trackedVariant = trackedPercentage >= 100 ? 'danger' : trackedPercentage > 50 ? 'warning' : 'success'

  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Monthly overview</p><h1>Spend</h1><p className="muted">Track grocery, shopping, food, and miscellaneous spending against your limits.</p></div><div className="spend-heading-actions"><DatePicker selected={selectedDate} onChange={(date) => { if (date) setMonth(formatIsoMonth(date)) }} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control aria-label="Spend month" />} /><Button variant="outline-primary" className="spend-limits-trigger" onClick={openLimits}>Edit limits</Button></div></div><section className="content-card month-progress-card"><div className="month-progress-header"><div><strong>{monthName}</strong><span>{monthProgress === 100 ? 'Month complete' : monthProgress === 0 ? 'Month has not started' : 'Day ' + now.getDate() + ' of ' + daysInMonth}</span></div><strong>{monthProgress}%</strong></div><ProgressBar now={monthProgress} variant="info" aria-label={monthProgress + '% of the month elapsed'} /></section><section className="content-card tracked-spend-card"><div><span>Tracked spend</span><small>Grocery + Shopping + Food + Misc</small></div><div className="tracked-spend-metric"><strong>{formatAmount(trackedSpend)}</strong><span>{Math.round(trackedPercentage)}% of limits</span></div><ProgressBar now={Math.min(Math.max(trackedPercentage, 0), 100)} variant={trackedVariant} /></section>{loading ? <p className="loading">Loading spend...</p> : <div className="spend-grid">{SPEND_TYPES.map((type) => { const spent = monthTransactions.filter((transaction) => transaction.type === type.value).reduce((total, transaction) => total + Number(transaction.amount || 0), 0); const limit = Number(limits[type.value] ?? 1000); const percentage = limit > 0 ? (spent / limit) * 100 : 0; const variant = percentage >= 100 ? 'danger' : percentage > 50 ? 'warning' : 'success'; return <Card className="spend-category-card" key={type.value}><Card.Body><div className="spend-category-heading"><div><span className="spend-category-emoji">{type.emoji}</span><Card.Title>{type.label}</Card.Title></div><strong className="spend-percent">{Math.round(percentage)}%</strong></div><ProgressBar now={Math.min(Math.max(percentage, 0), 100)} variant={variant} /><div className="spend-values"><span>Spent <strong>{formatAmount(spent)}</strong></span><span>Limit <strong>{formatAmount(limit)}</strong></span></div></Card.Body></Card>})}</div>}</div>
}

function monthElapsedPercent(month, now) {
  const current = formatIsoMonth(now)
  if (month < current) return 100
  if (month > current) return 0
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.round((now.getDate() / days) * 100)
}

function SpendLimitsModal({ limits, setLimits, save, busy, close }) {
  return <Modal show onHide={close} centered scrollable><Modal.Header closeButton><Modal.Title>Monthly spend limits</Modal.Title></Modal.Header><Modal.Body><Form onSubmit={(event) => { event.preventDefault(); save() }}><p className="muted">Set the monthly limit used to calculate each category’s spend percentage.</p><div className="limits-form-grid">{SPEND_TYPES.map((type) => <Form.Group key={type.value}><Form.Label htmlFor={'limit-' + type.value}>{type.emoji} {type.label}</Form.Label><InputGroup><InputGroup.Text>$</InputGroup.Text><Form.Control id={'limit-' + type.value} type="number" min="0" step="0.01" value={limits[type.value] ?? 1000} onChange={(event) => setLimits((current) => ({ ...current, [type.value]: event.target.value }))} /></InputGroup></Form.Group>)}</div><Button type="submit" variant="primary" className="w-100 mt-4" disabled={busy}>{busy ? 'Saving...' : 'Save limits'}</Button></Form></Modal.Body></Modal>
}

function DashboardView({ session, protectedCheck, protectedBusy, result }) {
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Private dashboard</p><h1>Hello World</h1><p className="muted">Your personal finance workspace starts here.</p></div></div><div className="welcome-panel"><span className="status-dot" /><div><p className="muted">Signed in as</p><strong>{session.user.email}</strong></div></div><section className="content-card protected-panel"><div><p className="eyebrow">Protected data check</p><h2>Test authenticated Supabase access</h2><p className="muted">Reads your profile and inserts a user-owned ping through Row Level Security.</p></div><Button className="primary-button" onClick={protectedCheck} disabled={protectedBusy}>{protectedBusy ? 'Checking...' : 'Run protected check'}</Button></section>{result && <pre className="result-box">{JSON.stringify(result, null, 2)}</pre>}</div>
}

function CardsView({ cards, allTransactions, bankLedger, cardsLoading, openCard, openAddCard }) {
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Your wallet</p><h1>Credit cards</h1><p className="muted">Click a card to view its statement and manage transactions.</p></div><Button variant="primary" className="add-card-trigger" onClick={openAddCard}>Add card</Button></div>{cardsLoading ? <p className="loading">Loading your cards...</p> : cards.length === 0 ? <section className="empty-state"><div className="empty-icon">▣</div><h2>No cards yet</h2><p className="muted">Add your first card above.</p><Button variant="primary" className="add-card-trigger" onClick={openAddCard}>Add card</Button></section> : <div className="cards-grid">{cards.map((card) => <CreditCardView key={card.id} card={card} statementSummary={statementSummary(card, allTransactions, bankLedger)} openCard={openCard} />)}</div>}</div>
}

function CreditCardView({ card, statementSummary, openCard }) {
  const clickCard = () => openCard(card)
  return <CreditCardVisual card={card} statementSummary={statementSummary} onClick={clickCard} />
}

function CreditCardVisual({ card, statementSummary, onClick, className = '' }) {
  const color = card.color || CARD_COLORS[0].value
  const isLight = color.toLowerCase() === '#ffffff'
  const interactiveProps = onClick ? { onClick, onKeyDown: (event) => { if (event.key === 'Enter' || event.key === ' ') onClick() }, role: 'button', tabIndex: 0 } : {}
  return <Card className={'credit-card ' + className} style={{ '--card-color': color, '--card-end-color': isLight ? '#e2e8f0' : '#172033', '--card-foreground': isLight ? '#172033' : '#ffffff', '--card-muted': isLight ? '#526079' : 'rgba(255,255,255,.72)' }} {...interactiveProps}><Card.Body><div className="card-heading-inline"><div className="card-chip" /><Card.Title>{card.name}</Card.Title></div><div className="statement-summary"><strong>{formatStatementDate(statementSummary.currentDate)}{statementSummary.statementAvailable && !statementSummary.paymentPaid && statementSummary.dueDate && <span className="due-date-badge">{statementSummary.dueInDays < 0 ? 'Overdue by ' + Math.abs(statementSummary.dueInDays) + ' days' : 'Due in ' + statementSummary.dueInDays + ' days: ' + formatStatementDate(statementSummary.dueDate)}</span>}</strong><strong>{formatAmount(statementSummary.currentTotal)}</strong><strong>{formatStatementDate(statementSummary.nextDate)}</strong><strong>{formatAmount(statementSummary.nextTotal)}</strong></div></Card.Body></Card>
}

function orderCardsByStatementDate(cards) {
  return [...cards].sort((left, right) => {
    if (!left.statement_day && !right.statement_day) return (left.sort_order || 0) - (right.sort_order || 0)
    if (!left.statement_day) return 1
    if (!right.statement_day) return -1
    return Number(left.statement_day) - Number(right.statement_day)
  })
}

function statementSummary(card, transactions, ledger = []) {
  const now = new Date()
  const currentCalendarMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const paymentFor = (month) => ledger.find((item) => item.source_type === 'card_payment' && item.card_id === card.id && item.statement_month?.slice(0, 7) === formatIsoMonth(month))
  const isPaid = (month) => { const payment = paymentFor(month); return Boolean(payment && Number(payment.realized_amount || 0) !== 0 && Number(payment.planned_amount || 0) === 0) }
  const totalForMonth = (date) => { const month = formatIsoMonth(date); return transactions.filter((transaction) => transaction.card_id === card.id && transaction.statement_month?.slice(0, 7) === month).reduce((total, transaction) => total + Number(transaction.amount || 0), 0) }
  const currentStatementDate = statementDateForMonth(currentCalendarMonth, card.statement_day)
  const currentMonthTotal = totalForMonth(currentCalendarMonth)
  const currentCleared = currentMonthTotal === 0 || isPaid(currentCalendarMonth)
  const currentPaid = Boolean(card.statement_day && currentStatementDate <= now && currentCleared)
  const anchorMonth = currentPaid ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : currentCalendarMonth
  const currentDate = statementDateForMonth(anchorMonth, card.statement_day)
  const nextMonth = new Date(anchorMonth.getFullYear(), anchorMonth.getMonth() + 1, 1)
  const nextDate = statementDateForMonth(nextMonth, card.statement_day)
  const paymentPaid = isPaid(anchorMonth)
  const currentTotal = totalForMonth(anchorMonth)
  const nextTotal = totalForMonth(nextMonth)
  const dueDate = card.due_day && !paymentPaid ? dueDateForStatement(currentDate, card.due_day) : null
  const dueInDays = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / 86400000) : null
  return { currentDate, currentTotal, nextDate, nextTotal, paymentPaid, dueDate, dueInDays, statementAvailable: Boolean(card.statement_day && currentDate <= now && !paymentPaid && currentTotal !== 0) }
}

function dueDateForStatement(statementDate, dueDay) {
  const day = Number(dueDay)
  let dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth(), Math.min(day, new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, 0).getDate()))
  if (dueDate <= statementDate) dueDate = new Date(statementDate.getFullYear(), statementDate.getMonth() + 1, Math.min(day, new Date(statementDate.getFullYear(), statementDate.getMonth() + 2, 0).getDate()))
  return dueDate
}

function statementDateForMonth(date, statementDay) {
  const day = statementDay ? Number(statementDay) : 1
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  return new Date(date.getFullYear(), date.getMonth(), Math.min(day, lastDay))
}

function statementPeriods(statementDay, now) {
  if (!statementDay) {
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const afterNextStart = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    return { currentDate: currentStart, currentStart, currentEnd: nextStart, nextDate: nextStart, nextStart, nextEnd: afterNextStart }
  }
  const requestedDay = Number(statementDay)
  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const dateFor = (year, month) => new Date(year, month, Math.min(requestedDay, daysInMonth(year, month)))
  let currentDate = dateFor(now.getFullYear(), now.getMonth())
  if (currentDate <= now) currentDate = dateFor(now.getFullYear(), now.getMonth() + 1)
  const previousDate = dateFor(currentDate.getFullYear(), currentDate.getMonth() - 1)
  const nextDate = dateFor(currentDate.getFullYear(), currentDate.getMonth() + 1)
  return { currentDate, currentStart: previousDate, currentEnd: currentDate, nextDate, nextStart: currentDate, nextEnd: nextDate }
}

function formatStatementDate(value) { return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) }

function CategoryPicker({ label, value, onChange }) {
  return <div className="category-picker"><Form.Label>{label}</Form.Label><Form.Select value={value} onChange={(event) => onChange(event.target.value)}>{TRANSACTION_TYPES.map((type) => <option value={type.value} key={type.value}>{type.emoji} {type.label}</option>)}</Form.Select></div>
}

function ColorPicker({ label, value, onChange }) {
  return <div className="color-picker"><span className="field-label">{label}</span><div className="color-options" role="radiogroup" aria-label={label}>{CARD_COLORS.map((color) => <Button type="button" key={color.value} className={value === color.value ? 'color-swatch selected' : 'color-swatch'} style={{ background: color.value }} title={color.name} aria-label={color.name} aria-checked={value === color.value} role="radio" onClick={() => onChange(color.value)}><span>{value === color.value ? '✓' : ''}</span></Button>)}</div></div>
}

function CardDetailModal({ card, statementSummary, bankAccounts, bankLedger, planCardPayment, paymentBusy, selectedCardDefaultStatementMonth, setSelectedCardDefaultStatementMonth, saveDefaultStatementMonth, defaultMonthBusy, workspaceTab, setWorkspaceTab, statementMonthFilter, setStatementMonthFilter, statementSearch, setStatementSearch, openPreferences, closeCard, transactions, transactionsLoading, transactionForm, changeTransaction, addTransaction, transactionBusy, transactionSuggestions, openEditTransaction, deleteTransaction }) {
  return <Modal show onHide={closeCard} centered size="xl" dialogClassName="transaction-modal-dialog" scrollable>
    <Modal.Header closeButton><Modal.Title><span className="eyebrow d-block">Card workspace</span>{card.name}</Modal.Title></Modal.Header>
    <Modal.Body><Tabs activeKey={workspaceTab} onSelect={(key) => setWorkspaceTab(key || 'add')}>
      <Tab eventKey="add" title="Add transaction"><div className="detail-columns transaction-workspace">
        <div className="card-preferences-column"><CreditCardVisual card={card} statementSummary={statementSummary} className="card-modal-preview" /><Button type="button" variant="outline-primary" onClick={openPreferences}>Edit card preferences</Button><Form.Label className="mt-2" htmlFor="default-statement-month">Default statement month</Form.Label><DatePicker id="default-statement-month" selected={parseMonth(selectedCardDefaultStatementMonth)} onChange={(date) => { if (date) setSelectedCardDefaultStatementMonth(formatIsoMonth(date)) }} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} /><Button type="button" variant="link" className="p-0 align-self-start" onClick={saveDefaultStatementMonth} disabled={defaultMonthBusy}>{defaultMonthBusy ? 'Saving...' : 'Save default month'}</Button></div>
        <div className="transaction-form-column"><div className="detail-section"><p className="eyebrow">New transaction</p><h3>Add a transaction</h3><Form className="transaction-form" onSubmit={addTransaction}><div className="transaction-types" role="radiogroup" aria-label="Transaction type">{TRANSACTION_TYPES.map((type) => <Button type="button" variant={transactionForm.type === type.value ? 'primary' : 'light'} key={type.value} className={transactionForm.type === type.value ? 'transaction-type selected' : 'transaction-type'} aria-pressed={transactionForm.type === type.value} onClick={() => changeTransaction({ target: { name: 'type', value: type.value } })}><span>{type.emoji}</span><small>{type.label}</small></Button>)}</div><Form.Label htmlFor="transaction-name">Name</Form.Label><TransactionNameTypeahead id="transaction-name" value={transactionForm.name} suggestions={transactionSuggestions} onChange={(value) => changeTransaction({ target: { name: 'name', value } })} /><div className="form-row"><div><Form.Label htmlFor="transaction-date">Date</Form.Label><DatePicker id="transaction-date" selected={parseDate(transactionForm.date)} onChange={(date) => { if (date) changeTransaction({ target: { name: 'date', value: formatIsoDate(date) } }) }} onSelect={(date) => { if (date) changeTransaction({ target: { name: 'date', value: formatIsoDate(date) } }) }} onChangeRaw={(event) => { const parsed = parseUserDate(event?.target?.value || ''); if (parsed) changeTransaction({ target: { name: 'date', value: formatIsoDate(parsed) } }) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="M/D or M/D/YYYY" customInput={<Form.Control />} required /></div><div><Form.Label htmlFor="transaction-amount">Dollar value</Form.Label><InputGroup><InputGroup.Text>$</InputGroup.Text><Form.Control id="transaction-amount" name="amount" type="number" step="0.01" value={transactionForm.amount} onChange={changeTransaction} placeholder="0.00" required /></InputGroup></div></div><Form.Label htmlFor="statement-month">Statement month</Form.Label><DatePicker id="statement-month" selected={parseMonth(transactionForm.statementMonth)} onChange={(date) => changeTransaction({ target: { name: 'statementMonth', value: formatIsoMonth(date) } })} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} required /><Form.Label htmlFor="cashflow-month">Cashflow month (optional)</Form.Label><DatePicker id="cashflow-month" selected={parseMonth(transactionForm.cashflowMonth)} onChange={(date) => changeTransaction({ target: { name: 'cashflowMonth', value: formatIsoMonth(date) } })} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} isClearable /><Button type="submit" variant="primary" disabled={transactionBusy}>{transactionBusy ? 'Saving...' : 'Add transaction'}</Button></Form></div></div>
        <div className="transaction-history recent-transactions-panel"><div className="history-heading"><h3>Transactions</h3><span>{transactions.length}</span></div>{transactionsLoading ? <p className="muted">Loading transactions...</p> : transactions.length === 0 ? <p className="muted">No transactions for this card yet.</p> : <div className="transaction-list">{transactions.map((transaction) => <div className="transaction-row" key={transaction.id}><span className="transaction-emoji">{transactionType(transaction.type).emoji}</span><div className="transaction-meta"><strong>{transaction.name}</strong><small>{transactionType(transaction.type).label} · {formatDate(transaction.transaction_date)} · Statement {formatMonth(transaction.statement_month)}</small></div><strong className="transaction-amount">{formatAmount(transaction.amount)}</strong><div className="transaction-row-actions"><Button type="button" size="sm" variant="outline-primary" onClick={() => openEditTransaction(transaction)}>Edit</Button><Button type="button" size="sm" variant="outline-danger" onClick={() => deleteTransaction(transaction)}>Delete</Button></div></div>)}</div>}</div>
      </div></Tab>
      <Tab eventKey="statement" title="Statement transactions"><StatementTransactions card={card} transactions={transactions} bankAccounts={bankAccounts} bankLedger={bankLedger} statementMonth={statementMonthFilter} setStatementMonth={setStatementMonthFilter} planCardPayment={planCardPayment} paymentBusy={paymentBusy} openEditTransaction={openEditTransaction} deleteTransaction={deleteTransaction} /></Tab>
    </Tabs></Modal.Body>
  </Modal>
}

function StatementTransactions({ card, transactions, bankAccounts, bankLedger, statementMonth, setStatementMonth, planCardPayment, paymentBusy, openEditTransaction, deleteTransaction }) {
  const periods = statementPeriods(card.statement_day, new Date())
  const months = [...new Set([formatIsoMonth(periods.currentDate), formatIsoMonth(periods.nextDate), ...transactions.map((transaction) => transaction.statement_month?.slice(0, 7)).filter(Boolean)])].sort()
  const existingPayment = bankLedger.find((item) => item.source_type === 'card_payment' && item.card_id === card.id && item.statement_month?.slice(0, 7) === statementMonth)
  const [paymentAccountId, setPaymentAccountId] = useState(existingPayment?.account_id || '')
  const [filters, setFilters] = useState({ name: '', amount: '', dateFrom: '', dateTo: '', category: '' })
  useEffect(() => { setPaymentAccountId(existingPayment?.account_id || '') }, [existingPayment?.id, existingPayment?.account_id, statementMonth])
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }))
  const query = filters.name.trim().toLowerCase()
  const statementTransactions = transactions.filter((transaction) => transaction.statement_month?.slice(0, 7) === statementMonth)
  const filtered = statementTransactions.filter((transaction) => { const amountText = String(transaction.amount); const date = transaction.transaction_date; const nameMatches = !query || transaction.name.toLowerCase().includes(query); const amountMatches = !filters.amount || amountText.includes(filters.amount.trim()); const fromMatches = !filters.dateFrom || date >= filters.dateFrom; const toMatches = !filters.dateTo || date <= filters.dateTo; const categoryMatches = !filters.category || transaction.type === filters.category; return nameMatches && amountMatches && fromMatches && toMatches && categoryMatches })
  const statementTotal = statementTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  return <div className="statement-view"><div className="statement-controls card-transaction-filters"><Form.Select value={statementMonth} onChange={(event) => setStatementMonth(event.target.value)} aria-label="Statement month">{months.map((month) => <option value={month} key={month}>{formatMonth(month + '-01')}</option>)}</Form.Select><Form.Control value={filters.name} onChange={(event) => updateFilter('name', event.target.value)} placeholder="Search name" aria-label="Search transaction name" /><Form.Control type="number" step="0.01" value={filters.amount} onChange={(event) => updateFilter('amount', event.target.value)} placeholder="Filter amount" aria-label="Filter transaction amount" /><DatePicker selectsRange startDate={parseDate(filters.dateFrom)} endDate={parseDate(filters.dateTo)} onChange={(dates) => { const [start, end] = dates; setFilters((current) => ({ ...current, dateFrom: formatIsoDate(start), dateTo: formatIsoDate(end) })) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="Any date range" isClearable customInput={<Form.Control />} /><Form.Select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)} aria-label="Filter transaction category"><option value="">All categories</option>{TRANSACTION_TYPES.map((type) => <option value={type.value} key={type.value}>{type.emoji} {type.label}</option>)}</Form.Select></div><div className="statement-total"><div><span>{formatMonth(statementMonth + '-01')}</span><strong>{formatAmount(statementTotal)}</strong></div><small>{filtered.length} visible / {statementTransactions.length} total</small></div><div className="card-payment-planner"><div><strong>Planned card payment</strong><small>Payment amount follows every transaction in this statement month.</small></div><div className="card-payment-controls"><Form.Select value={paymentAccountId} onChange={(event) => setPaymentAccountId(event.target.value)} aria-label="Payment bank account"><option value="">Choose bank account</option>{bankAccounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}</Form.Select><Button variant="primary" disabled={!paymentAccountId || paymentBusy} onClick={() => planCardPayment({ cardId: card.id, cardName: card.name, statementMonth, statementDay: card.statement_day, accountId: paymentAccountId, amount: statementTotal })}>{paymentBusy ? 'Saving...' : existingPayment ? 'Update payment' : 'Plan payment'}</Button></div>{existingPayment && <small className="text-muted">Currently planned from {bankAccounts.find((account) => account.id === existingPayment.account_id)?.name || 'another account'}.</small>}</div>{filtered.length === 0 ? <div className="empty-state compact"><div className="empty-icon">↔</div><p className="muted">No transactions match these filters.</p></div> : <div className="transaction-list statement-transaction-list">{filtered.map((transaction) => <div className="transaction-row" key={transaction.id}><span className="transaction-emoji">{transactionType(transaction.type).emoji}</span><div className="transaction-meta"><strong>{transaction.name}</strong><small>{transactionType(transaction.type).label} · {formatDate(transaction.transaction_date)}</small></div><strong className="transaction-amount">{formatAmount(transaction.amount)}</strong><div className="transaction-row-actions"><Button type="button" size="sm" variant="outline-primary" onClick={() => openEditTransaction(transaction)}>Edit</Button><Button type="button" size="sm" variant="outline-danger" onClick={() => deleteTransaction(transaction)}>Delete</Button></div></div>)}</div>}</div>
}

function AddCardModal({ cardName, setCardName, cardColor, setCardColor, cardDefaultCategory, cardDueDay, setCardDueDay, setCardDefaultCategory, cardStatementDay, setCardStatementDay, cardBusy, addCard, close }) {
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title>Add credit card</Modal.Title></Modal.Header><Modal.Body><Form className="add-card-modal-form" onSubmit={addCard}><Form.Group className="mb-3"><Form.Label htmlFor="card-name">Card name</Form.Label><Form.Control id="card-name" value={cardName} onChange={(event) => setCardName(event.target.value)} placeholder="e.g. Everyday Rewards" maxLength={80} required /></Form.Group><ColorPicker label="Card color" value={cardColor} onChange={setCardColor} /><CategoryPicker label="Default category" value={cardDefaultCategory} onChange={setCardDefaultCategory} /><div className="statement-day-field mt-3"><Form.Label htmlFor="card-statement-day">Statement date (optional)</Form.Label><Form.Control id="card-statement-day" type="number" min="1" max="31" value={cardStatementDay} onChange={(event) => setCardStatementDay(event.target.value)} placeholder="Day 1–31" /><Form.Label className="mt-3" htmlFor="card-due-day">Due date (optional)</Form.Label><Form.Control id="card-due-day" type="number" min="1" max="31" value={cardDueDay} onChange={(event) => setCardDueDay(event.target.value)} placeholder="Day 1–31" /></div><Button type="submit" variant="primary" className="w-100 mt-4" disabled={cardBusy}>{cardBusy ? 'Adding...' : 'Add card'}</Button></Form></Modal.Body></Modal>
}

function CardPreferencesModal({ card, selectedCardColor, setSelectedCardColor, selectedCardDueDay, setSelectedCardDueDay, selectedCardDefaultCategory, setSelectedCardDefaultCategory, selectedCardStatementDay, setSelectedCardStatementDay, saveCardColor, colorBusy, close }) {
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title><span className="eyebrow d-block">Card preferences</span>{card.name}</Modal.Title></Modal.Header><Modal.Body><div className="detail-preview mb-4" style={{ '--card-color': selectedCardColor }}><div className="card-chip" /><span>{card.name}</span><div className="card-placeholder">••••  ••••  ••••  ••••</div></div><Form><ColorPicker label="Card color" value={selectedCardColor} onChange={setSelectedCardColor} /><CategoryPicker label="Default transaction category" value={selectedCardDefaultCategory} onChange={setSelectedCardDefaultCategory} /><div className="statement-day-field mt-3"><Form.Label htmlFor="selected-card-statement-day">Statement date (optional)</Form.Label><Form.Control id="selected-card-statement-day" type="number" min="1" max="31" value={selectedCardStatementDay} onChange={(event) => setSelectedCardStatementDay(event.target.value)} placeholder="Day 1–31" /><Form.Label className="mt-3" htmlFor="selected-card-due-day">Due date (optional)</Form.Label><Form.Control id="selected-card-due-day" type="number" min="1" max="31" value={selectedCardDueDay} onChange={(event) => setSelectedCardDueDay(event.target.value)} placeholder="Day 1–31" /></div><Button type="button" variant="primary" className="w-100 mt-4" onClick={saveCardColor} disabled={colorBusy}>{colorBusy ? 'Saving...' : 'Save preferences'}</Button></Form></Modal.Body></Modal>
}

function TransactionsView({ transactions, cards, loading, filters, setFilters, onSearch, openEditTransaction, deleteTransaction, bulkUpdateTransactions }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState({ date: '', statementMonth: '', cashflowMonth: '', clearCashflow: false })
  const cardNames = new Map(cards.map((card) => [card.id, card.name]))
  useEffect(() => setSelectedIds((current) => current.filter((id) => transactions.some((transaction) => transaction.id === id))), [transactions])
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }))
  const clearFilters = () => { setFilters(blankActivityFilters); onSearch(blankActivityFilters) }
  const hasFilters = Object.values(filters).some(Boolean)
  const matchTotal = transactions.reduce((total, transaction) => total + Number(transaction.amount || 0), 0)
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length
  const toggleSelected = (id) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleAll = () => setSelectedIds(allSelected ? [] : transactions.map((transaction) => transaction.id))
  const submitBulk = async (event) => {
    event.preventDefault()
    const changes = {}
    if (bulkForm.date) changes.transaction_date = bulkForm.date
    if (bulkForm.statementMonth) changes.statement_month = bulkForm.statementMonth + '-01'
    if (bulkForm.clearCashflow) changes.cashflow_month = null
    else if (bulkForm.cashflowMonth) changes.cashflow_month = bulkForm.cashflowMonth + '-01'
    if (!Object.keys(changes).length) return
    const updated = await bulkUpdateTransactions(selectedIds, changes)
    if (updated) { setBulkOpen(false); setSelectedIds([]); setBulkForm({ date: '', statementMonth: '', cashflowMonth: '', clearCashflow: false }) }
  }
  return <div className="view-stack"><div className="page-heading"><div><p className="eyebrow">Activity</p><h1>Transactions</h1><p className="muted">Search and edit matching transactions.</p></div></div><section className="content-card transactions-page"><Form className="activity-filters" onSubmit={(event) => { event.preventDefault(); setSelectedIds([]); onSearch(filters) }}><Form.Group><Form.Label htmlFor="activity-name">Name</Form.Label><Form.Control id="activity-name" value={filters.name} onChange={(event) => updateFilter('name', event.target.value)} placeholder="Search name" /></Form.Group><Form.Group><Form.Label htmlFor="activity-amount">Amount</Form.Label><Form.Control id="activity-amount" type="number" step="0.01" value={filters.amount} onChange={(event) => updateFilter('amount', event.target.value)} placeholder="Exact amount" /></Form.Group><Form.Group><Form.Label htmlFor="activity-date-range">Date range</Form.Label><DatePicker id="activity-date-range" selectsRange startDate={parseDate(filters.dateFrom)} endDate={parseDate(filters.dateTo)} onChange={(dates) => { const [start, end] = dates; setFilters((current) => ({ ...current, dateFrom: formatIsoDate(start), dateTo: formatIsoDate(end) })) }} onChangeRaw={(event) => { const parsed = parseUserDate(event?.target?.value || ''); if (parsed) setFilters((current) => current.dateFrom ? { ...current, dateTo: formatIsoDate(parsed) } : { ...current, dateFrom: formatIsoDate(parsed) }) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="Any date range" isClearable customInput={<Form.Control />} /></Form.Group><Form.Group><Form.Label htmlFor="activity-statement-month">Statement month</Form.Label><DatePicker id="activity-statement-month" selected={parseMonth(filters.statementMonth)} onChange={(date) => updateFilter('statementMonth', formatIsoMonth(date))} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" placeholderText="Any month" isClearable customInput={<Form.Control />} /></Form.Group><Form.Group><Form.Label htmlFor="activity-cashflow-month">Cashflow month</Form.Label><DatePicker id="activity-cashflow-month" selected={parseMonth(filters.cashflowMonth)} onChange={(date) => updateFilter('cashflowMonth', formatIsoMonth(date))} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" placeholderText="Any month" isClearable customInput={<Form.Control className="month-picker-control" />} /></Form.Group><Form.Group><Form.Label htmlFor="activity-card">Card</Form.Label><Form.Select id="activity-card" value={filters.cardId} onChange={(event) => updateFilter('cardId', event.target.value)}><option value="">All cards</option>{cards.map((card) => <option value={card.id} key={card.id}>{card.name}</option>)}</Form.Select></Form.Group><Form.Group><Form.Label htmlFor="activity-category">Category</Form.Label><Form.Select id="activity-category" value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">All categories</option>{TRANSACTION_TYPES.map((type) => <option value={type.value} key={type.value}>{type.emoji} {type.label}</option>)}</Form.Select></Form.Group><div className="activity-filter-actions"><Button type="submit" variant="primary">Search</Button><Button type="button" variant="outline-secondary" onClick={clearFilters}>Clear</Button></div></Form><div className="history-heading activity-results-heading"><div className="d-flex align-items-center gap-2"><Form.Check type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all visible transactions" /><h3>{hasFilters ? 'Matching transactions' : 'Recent transactions'}</h3></div><span>{transactions.length}</span></div>{hasFilters && <div className="activity-filter-total"><span>Filtered total</span><strong>{formatAmount(matchTotal)}</strong></div>}{selectedIds.length > 0 && <div className="bulk-action-bar"><span>{selectedIds.length} selected</span><Button size="sm" variant="primary" onClick={() => setBulkOpen(true)}>Bulk edit</Button><Button size="sm" variant="outline-secondary" onClick={() => setSelectedIds([])}>Clear selection</Button></div>}{loading ? <p className="muted">Loading transactions...</p> : transactions.length === 0 ? <div className="empty-state compact"><div className="empty-icon">↔</div><h2>No matching transactions</h2><p className="muted">Try changing the filters or add a transaction from a card workspace.</p></div> : <div className="transaction-list full-list">{transactions.map((transaction) => <div className="transaction-row" key={transaction.id}><Form.Check type="checkbox" checked={selectedIds.includes(transaction.id)} onChange={() => toggleSelected(transaction.id)} aria-label={'Select ' + transaction.name} /><span className="transaction-emoji">{transactionType(transaction.type).emoji}</span><div className="transaction-meta"><strong>{transaction.name}</strong><small>{cardNames.get(transaction.card_id) || 'Unknown card'} · {transactionType(transaction.type).label} · {formatDate(transaction.transaction_date)} · Statement {formatMonth(transaction.statement_month)}</small></div><strong className="transaction-amount">{formatAmount(transaction.amount)}</strong><div className="transaction-row-actions"><Button type="button" size="sm" variant="outline-primary" onClick={() => openEditTransaction(transaction)}>Edit</Button><Button type="button" size="sm" variant="outline-danger" onClick={() => deleteTransaction(transaction)}>Delete</Button></div></div>)}</div>}{bulkOpen && <BulkEditTransactionsModal form={bulkForm} setForm={setBulkForm} count={selectedIds.length} save={submitBulk} close={() => setBulkOpen(false)} />}</section></div>
}


function BulkEditTransactionsModal({ form, setForm, count, save, close }) {
  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title>Bulk edit transactions</Modal.Title></Modal.Header><Modal.Body><Form onSubmit={save}><p className="muted">Update {count} selected transaction{count === 1 ? '' : 's'}. Leave fields blank to keep their existing values.</p><Form.Group className="mb-3"><Form.Label>Date</Form.Label><DatePicker selected={parseDate(form.date)} onChange={(date) => update('date', formatIsoDate(date))} dateFormat="MMM d, yyyy" placeholderText="Keep existing date" isClearable customInput={<Form.Control />} /></Form.Group><Form.Group className="mb-3"><Form.Label>Statement month</Form.Label><DatePicker selected={parseMonth(form.statementMonth)} onChange={(date) => update('statementMonth', formatIsoMonth(date))} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" placeholderText="Keep existing month" isClearable customInput={<Form.Control className="month-picker-control" />} /></Form.Group><Form.Group className="mb-3"><Form.Label>Cashflow month</Form.Label><DatePicker selected={parseMonth(form.cashflowMonth)} onChange={(date) => update('cashflowMonth', formatIsoMonth(date))} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" placeholderText="Keep existing month" isClearable customInput={<Form.Control className="month-picker-control" />} /></Form.Group><Form.Check className="mb-3" type="checkbox" label="Clear cashflow month" checked={form.clearCashflow} onChange={(event) => update('clearCashflow', event.target.checked)} /><Button type="submit" variant="primary" className="w-100">Apply changes</Button></Form></Modal.Body></Modal>
}

function TransactionEditModal({ transaction, form, suggestions, changeForm, save, remove, busy, close }) {
  return <Modal show onHide={close} centered><Modal.Header closeButton><Modal.Title><span className="eyebrow d-block">Edit transaction</span>{transaction.name}</Modal.Title></Modal.Header><Modal.Body><Form className="transaction-form" onSubmit={save}><div className="transaction-types" role="radiogroup" aria-label="Transaction type">{TRANSACTION_TYPES.map((type) => <Button type="button" variant={form.type === type.value ? 'primary' : 'light'} key={type.value} className={form.type === type.value ? 'transaction-type selected' : 'transaction-type'} aria-pressed={form.type === type.value} onClick={() => changeForm({ target: { name: 'type', value: type.value } })}><span>{type.emoji}</span><small>{type.label}</small></Button>)}</div><Form.Label htmlFor="edit-transaction-name">Name</Form.Label><TransactionNameTypeahead id="edit-transaction-name" value={form.name} suggestions={suggestions} onChange={(value) => changeForm({ target: { name: 'name', value } })} /><div className="form-row"><div><Form.Label htmlFor="edit-transaction-date">Date</Form.Label><DatePicker id="edit-transaction-date" selected={parseDate(form.date)} onChange={(date) => { if (date) changeForm({ target: { name: 'date', value: formatIsoDate(date) } }) }} onSelect={(date) => { if (date) changeForm({ target: { name: 'date', value: formatIsoDate(date) } }) }} onChangeRaw={(event) => { const parsed = parseUserDate(event?.target?.value || ''); if (parsed) changeForm({ target: { name: 'date', value: formatIsoDate(parsed) } }) }} dateFormat={['M/d/yyyy', 'M/d', 'MMM d, yyyy']} placeholderText="M/D or M/D/YYYY" customInput={<Form.Control />} required /></div><div><Form.Label htmlFor="edit-transaction-amount">Dollar value</Form.Label><InputGroup><InputGroup.Text>$</InputGroup.Text><Form.Control id="edit-transaction-amount" name="amount" type="number" step="0.01" value={form.amount} onChange={changeForm} required /></InputGroup></div></div><Form.Label htmlFor="edit-statement-month">Statement month</Form.Label><DatePicker id="edit-statement-month" selected={parseMonth(form.statementMonth)} onChange={(date) => changeForm({ target: { name: 'statementMonth', value: formatIsoMonth(date) } })} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} required /><Form.Label htmlFor="edit-cashflow-month">Cashflow month (optional)</Form.Label><DatePicker id="edit-cashflow-month" selected={parseMonth(form.cashflowMonth)} onChange={(date) => changeForm({ target: { name: 'cashflowMonth', value: formatIsoMonth(date) } })} showMonthYearPicker showFullMonthYearPicker dateFormat="MMM yyyy" customInput={<Form.Control className="month-picker-control" />} isClearable /><div className="edit-actions"><Button type="button" variant="outline-danger" onClick={() => remove(transaction)}>Delete</Button><Button type="submit" variant="primary" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</Button></div></Form></Modal.Body></Modal>
}

function TransactionNameTypeahead({ id, value, suggestions, onChange }) {
  const commitSelection = (selected) => {
    const item = selected[0]
    onChange(typeof item === 'string' ? item : item?.label || '')
  }
  return <Typeahead id={id} options={suggestions} selected={value ? [value] : []} allowNew newSelectionPrefix="" onInputChange={(text) => onChange(text || '')} onChange={commitSelection} onBlur={(event) => onChange(event.target.value || '')} placeholder="e.g. Supermarket" inputProps={{ required: true, name: 'name' }} />
}

function parseDate(value) { return value ? new Date(value + 'T00:00:00') : null }
function normalizeStatementDay(value) {
  if (value === '' || value === null || value === undefined) return null
  const day = Number(value)
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null
}
function parseUserDate(value) {
  const match = value.trim().match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const year = match[3] ? (match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3])) : new Date().getFullYear()
  const parsed = new Date(year, month - 1, day)
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day ? parsed : null
}
function parseMonth(value) { return value ? new Date(value + '-01T00:00:00') : null }
function formatIsoDate(value) { return value ? value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') + '-' + String(value.getDate()).padStart(2, '0') : '' }
function formatIsoMonth(value) { return value ? value.getFullYear() + '-' + String(value.getMonth() + 1).padStart(2, '0') : '' }

function transactionType(value) { return TRANSACTION_TYPES.find((type) => type.value === value) || TRANSACTION_TYPES[3] }
function formatDate(value) { return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }
function formatMonth(value) { return new Date(value + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) }
function formatPlainAmount(value) { const amount = Number(value || 0); return (amount < 0 ? '-$' : '$') + Math.abs(amount).toFixed(2) }
function formatAccountAmount(currency, value) {
  const code = currency || 'USD'
  const amount = Number(value || 0)
  const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).formatToParts(amount)
  return <>{parts.map((part, index) => part.type === 'currency' ? <span className="currency-symbol" key={index}>{part.value}</span> : <span key={index}>{part.value}</span>)}</>
}
function currencySymbol(currency) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', currencyDisplay: 'narrowSymbol' }).formatToParts(0).find((part) => part.type === 'currency')?.value || currency || 'USD'
}
function formatAmount(value) { const amount = Number(value); return <><span className="currency-symbol">{amount < 0 ? '-$' : '$'}</span>{Math.abs(amount).toFixed(2)}</> }
function Notice({ notice }) {
  const [show, setShow] = useState(true)
  useEffect(() => setShow(true), [notice])
  return <ToastContainer position="top-end" className="p-3 status-toast-container"><Toast show={show} onClose={() => setShow(false)} bg={notice.type === 'error' ? 'danger' : 'success'} autohide={notice.type !== 'error'} delay={4000} role={notice.type === 'error' ? 'alert' : 'status'}><Toast.Header closeButton><strong className="me-auto">{notice.type === 'error' ? 'Error' : 'Success'}</strong></Toast.Header><Toast.Body>{notice.text}</Toast.Body></Toast></ToastContainer>
}
