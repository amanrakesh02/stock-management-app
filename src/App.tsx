import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import ScanPage from './pages/ScanPage'
import DeliveryPage from './pages/DeliveryPage'
import SuppliersPage from './pages/SuppliersPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
