// frontend/src/components/Layout/Footer.jsx - Componente Footer
import { motion } from 'framer-motion'
import { Heart, Zap, Github, MapPin } from 'lucide-react'

const Footer = () => {
  const currentYear = new Date().getFullYear()

  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white border-t border-gray-200 px-4 lg:px-6 py-3"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-600">
        {/* Información de copyright */}
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <span>©</span>
          <span>{currentYear}</span>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-1"
          >
            <Zap className="h-4 w-4 text-primary-500" />
            <span className="font-semibold text-gray-800">CocoPet ML</span>
          </motion.div>
        </div>

        {/* Información central */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <MapPin className="h-3 w-3 text-gray-400" />
            <span>Cancún, Q.R.</span>
          </div>
          <div className="hidden sm:block">•</div>
          <div className="flex items-center space-x-1">
            <span>Hecho con</span>
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Heart className="h-3 w-3 text-red-500 fill-current" />
            </motion.div>
            <span>para mascotas</span>
          </div>
        </div>

        {/* Links y estado */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Sistema activo</span>
          </div>
          
          <div className="hidden sm:block text-gray-300">|</div>
          
          <motion.a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 hover:text-gray-800 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Github className="h-4 w-4" />
            <span className="hidden sm:inline">v1.0.0</span>
          </motion.a>
        </div>
      </div>
    </motion.footer>
  )
}

export default Footer