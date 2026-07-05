try {
  const storedTheme = localStorage.getItem("gigsmith.theme.v1");
  const theme = storedTheme === "light" || storedTheme === "neon" ? storedTheme : "dark";
  const themeColor = theme === "light" ? "#edf3f2" : theme === "neon" ? "#050008" : "#080a0b";
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.append(themeColorMeta);
  }
  document.documentElement.dataset.theme = theme;
  themeColorMeta.content = themeColor;
  themeColorMeta.setAttribute("content", themeColor);
} catch {
  document.documentElement.dataset.theme = "dark";
}
