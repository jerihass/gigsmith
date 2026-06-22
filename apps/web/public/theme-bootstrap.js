try {
  const storedTheme = localStorage.getItem("gigsmith.theme.v1");
  const theme = storedTheme === "light" || storedTheme === "neon" ? storedTheme : "dark";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "light"
    ? "#edf3f2"
    : theme === "neon" ? "#050008" : "#080a0b";
} catch {
  document.documentElement.dataset.theme = "dark";
}
