"use strict";
let currentUser = null;
async function loginAdmin(email, password) {
    const res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
        return { ok: false, error: res.error.message };
    }
    const userEmail = (res.data.user && res.data.user.email) || email;
    currentUser = { email: userEmail };
    return { ok: true };
}
async function logoutAdmin() {
    await sb.auth.signOut();
    currentUser = null;
    window.location.reload();
}
async function checkSession() {
    const res = await sb.auth.getSession();
    if (res.data.session) {
        currentUser = { email: res.data.session.user.email };
        return true;
    }
    return false;
}
