import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'react-datepicker/dist/react-datepicker.css'
import 'react-bootstrap-typeahead/css/Typeahead.css'
import App from './App.jsx'
import './App.css'

const Router = import.meta.env.BASE_URL === '/budget-nerd/' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode><Router><App /></Router></StrictMode>,
)
