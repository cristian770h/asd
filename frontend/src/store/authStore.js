// frontend/src/store/authStore.js - Store de Autenticación
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado inicial
      user: null,
      isAuthenticated: false,
      isLoading: false,
      permissions: [],
      
      // Datos del usuario por defecto (para demo)
      defaultUser: {
        id: 1,
        name: 'Administrador',
        email: 'admin@cocopet.com',
        role: 'admin',
        avatar: null,
        preferences: {
          theme: 'light',
          language: 'es',
          notifications: true,
          dashboard_layout: 'default'
        },
        lastLogin: new Date().toISOString(),
        permissions: ['all']
      },

      // Acciones
      initializeAuth: () => {
        set({ isLoading: true })
        
        // Simular carga de usuario (en una app real sería una llamada API)
        setTimeout(() => {
          const { defaultUser } = get()
          set({
            user: defaultUser,
            isAuthenticated: true,
            isLoading: false,
            permissions: defaultUser.permissions
          })
        }, 1000)
      },

      login: async (credentials) => {
        set({ isLoading: true })
        
        try {
          // Simular llamada API de login
          await new Promise(resolve => setTimeout(resolve, 1500))
          
          const { defaultUser } = get()
          const user = {
            ...defaultUser,
            lastLogin: new Date().toISOString()
          }
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            permissions: user.permissions
          })
          
          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          return { success: false, error: error.message }
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          permissions: []
        })
      },

      updateUser: (userData) => {
        const { user } = get()
        if (user) {
          const updatedUser = { ...user, ...userData }
          set({ user: updatedUser })
        }
      },

      updatePreferences: (preferences) => {
        const { user } = get()
        if (user) {
          const updatedUser = {
            ...user,
            preferences: { ...user.preferences, ...preferences }
          }
          set({ user: updatedUser })
        }
      },

      // Helpers de permisos
      hasPermission: (permission) => {
        const { permissions } = get()
        return permissions.includes('all') || permissions.includes(permission)
      },

      hasAnyPermission: (permissionsList) => {
        const { permissions } = get()
        if (permissions.includes('all')) return true
        return permissionsList.some(permission => permissions.includes(permission))
      },

      hasAllPermissions: (permissionsList) => {
        const { permissions } = get()
        if (permissions.includes('all')) return true
        return permissionsList.every(permission => permissions.includes(permission))
      },

      // Helpers de rol
      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },

      isManager: () => {
        const { user } = get()
        return user?.role === 'manager' || user?.role === 'admin'
      },

      isUser: () => {
        const { user } = get()
        return user?.role === 'user'
      }
    }),
    {
      name: 'cocopet-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions
      })
    }
  )
)