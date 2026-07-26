const el = document.getElementById("hmr-label");
if (el) {
    el.textContent = "hmr-v1";
}
if (import.meta.hot) {
    import.meta.hot.accept();
}
