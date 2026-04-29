"""
Retriever for the Knowledge Service.
Searches ChromaDB for the most relevant documentation chunks
given a compatibility analysis query.
"""

import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# pylint: disable=wrong-import-position
from knowledge_service.indexer.document_loader import get_chroma_collection
from knowledge_service.indexer.embedder import embed_texts

logger = logging.getLogger(__name__)

DEFAULT_TOP_K = 5


def search(query: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    """
    Search for the most relevant documentation chunks for a given query.

    Args:
        query: the search query (e.g. a feature name or compatibility question)
        top_k: number of results to return

    Returns:
        list of dicts with keys: text, source, chunk_index, distance
    """
    if not query or not query.strip():
        return []

    collection = get_chroma_collection()

    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty. Run indexing first.")
        return []

    query_embedding = embed_texts([query])[0]

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(top_k, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for doc, metadata, distance in zip(documents, metadatas, distances):
        chunks.append({
            "text": doc,
            "source": metadata.get("source", ""),
            "chunk_index": metadata.get("chunk_index", 0),
            "distance": round(distance, 4),
        })

    logger.info(
        "Search for '%s' returned %d results.",
        query[:50],
        len(chunks),
    )

    return chunks


def search_for_component(component: dict, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    """
    Build a query from a compatibility result and search for relevant docs.
    Used by the report_service to enrich LLM prompts with RAG context.

    Args:
        component: dict from compatibility_service with features_analyzed
        top_k: number of results

    Returns:
        list of relevant documentation chunks
    """
    plugin = component.get("plugin", "")
    overall_status = component.get("overall_status", "")
    features = [
        feature["feature"]
        for feature in component.get("features_analyzed", [])
        if feature["risk_level"] in ("BLOCKER", "MAJOR")
    ]

    if not features:
        return []

    query = (
        f"{plugin} plugin compatibility Jira Cloud: "
        f"{', '.join(features[:5])} — status: {overall_status}"
    )

    logger.info(
        "RAG query for component %s: %s",
        component.get("component_id"),
        query,
    )

    return search(query, top_k=top_k)
