const AUTH_API = '/api';

const Auth = {
    getToken() {
        return localStorage.getItem('auth_token');
    },

    setToken(token) {
        localStorage.setItem('auth_token', token);
    },

    removeToken() {
        localStorage.removeItem('auth_token');
    },

    getUser() {
        const raw = localStorage.getItem('auth_user');
        return raw ? JSON.parse(raw) : null;
    },

    setUser(user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
    },

    removeUser() {
        localStorage.removeItem('auth_user');
    },

    logout() {
        const token = this.getToken();
        if (token) {
            fetch(AUTH_API + '/logout', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' }
            }).catch(() => {});
        }
        this.removeToken();
        this.removeUser();
        window.location.href = '/auth/login.html';
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    async fetch(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }

        const isFormData = options.body instanceof FormData;
        if (isFormData) {
            delete headers['Content-Type'];
        }

        const response = await fetch(AUTH_API + endpoint, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return { ok: response.ok, status: response.status, data: await response.json() };
        }
        return { ok: response.ok, status: response.status, data: null };
    },

    async login(email, password) {
        const res = await this.fetch('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        return res;
    },

    async register(payload) {
        const res = await this.fetch('/register', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return res;
    },

    async googleCallback(credential) {
        const res = await this.fetch('/google/callback', {
            method: 'POST',
            body: JSON.stringify({ credential })
        });
        return res;
    },

    async completarPerfil(data) {
        const res = await this.fetch('/completar-perfil', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return res;
    },

    async getUserProfile() {
        const res = await this.fetch('/usuario');
        return res;
    },

    saveSession(data) {
        if (data.token) this.setToken(data.token);
        if (data.data) this.setUser(data.data);
    },

    isProfileComplete(user) {
        if (!user || !user.cliente) return false;
        const c = user.cliente;
        return !!(c.direccion && c.direccion.trim() && c.numero_telefono && c.numero_telefono > 0);
    },

    redirectAfterLogin(userData) {
        const rol = userData.rol || userData.rol_id;
        const user = { id: userData.id, email: userData.email, rol: rol, rol_id: rol, tipo_suscripcion: userData.tipo_suscripcion, cliente: userData.cliente };

        if (rol === 1) {
            window.location.href = '/admin/index.html';
            return;
        }

        if (this.isProfileComplete(user)) {
            window.location.href = '/cliente/index.html';
        } else {
            window.location.href = '/auth/completar-perfil.html';
        }
    }
};
