def sanitize_input(text):
    if not text or not isinstance(text, str):
        return ""
    return text.strip()[:1000]

