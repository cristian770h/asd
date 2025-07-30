// frontend/src/components/Inventory/Inventory.jsx - Componente de Inventario
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  RefreshCw,
  Download,
  Plus,
  Edit,
  Trash2,
  Eye,
  BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'

import Card from '../components/UI/Card'
import Button from '../components/UI/Button'
import Alert from '../components/UI/Alert'
import Modal from '../components/UI/Modal'
import Input from '../components/UI/Input'
import Select from '../components/UI/Select'
import { useInventory } from '@/hooks/useInventory'
import { formatCurrency, formatDate } from '../utils/formatters'
import { exportToExcel } from '../utils/exportUtils'

const Inventory = () => {
  return(
    <>
    </>
  )
}
export default Inventory