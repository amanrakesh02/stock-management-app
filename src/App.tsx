import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProductsPage from './pages/ProductsPage'
import ScanPage from './pages/ScanPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
	        <Route path="/scan" element={<ScanPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
