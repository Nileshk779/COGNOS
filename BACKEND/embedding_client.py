_model = None


def get_embedder():
    """Imported lazily -- sentence-transformers pulls in sklearn/scipy, a
    heavy chain that has no business being loaded (or able to crash the
    whole API) just because main.py imported this module at startup."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model
