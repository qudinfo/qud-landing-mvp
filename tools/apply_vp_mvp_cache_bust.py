from pathlib import Path

path = Path('portal/portfolio/mvp/index.html')
text = path.read_text()
text = text.replace('href="./styles.css"', 'href="./styles.css?v=20260806-1205"')
text = text.replace('src="./app.js" defer', 'src="./app.js?v=20260806-1205" defer')
path.write_text(text)
