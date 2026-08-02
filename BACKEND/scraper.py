"""
scraper.py
Pulls raw content (YouTube, podcasts, articles, PDFs) for each goal category
and writes it to raw_content.json. Does NOT touch embeddings/vectors —
that's vectorize_and_store.py's job. Kept separate so a failed vectorize
run doesn't force you to re-scrape everything.

Run: python scraper.py
Output: raw_content.json (list of content dicts)
"""

import os
import re
import json
import time
import requests
import feedparser
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
OUTPUT_FILE = "raw_content.json"

# ---- CONFIG: adjust categories, queries, and per-source targets here ----

GOAL_CATEGORIES = {

      "artificial_intelligence": {
        "youtube_queries": [
            "artificial intelligence full course",
            "AI for beginners",
            "machine learning roadmap",
            "deep learning explained",
            "generative AI tutorial",
            "large language models explained",
            "prompt engineering guide",
            "AI projects for beginners"
        ],
        "podcast_terms": [
            "artificial intelligence",
            "machine learning",
            "AI research",
            "generative AI",
            "OpenAI"
        ],
        "medium_tags": [
            "artificial-intelligence",
            "machine-learning",
            "deep-learning",
            "generative-ai",
            "llm"
        ],
        "arxiv_query": "cat:cs.AI OR cat:cs.LG OR cat:cs.CL",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 30,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "programming": {
        "youtube_queries": [
            "learn programming",
            "python programming",
            "c++ tutorial",
            "java programming",
            "data structures algorithms",
            "coding interview preparation",
            "software engineering roadmap",
            "object oriented programming"
        ],
        "podcast_terms": [
            "software engineering",
            "programming",
            "coding",
            "developer podcast",
            "clean code"
        ],
        "medium_tags": [
            "programming",
            "python",
            "coding",
            "software-engineering",
            "algorithms"
        ],
        "arxiv_query": "cat:cs.SE",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 20,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "web_development": {
        "youtube_queries": [
            "full stack web development",
            "HTML CSS JavaScript",
            "React tutorial",
            "Next.js guide",
            "Node.js backend",
            "frontend roadmap",
            "backend development",
            "MERN stack project"
        ],
        "podcast_terms": [
            "web development",
            "frontend",
            "backend",
            "react",
            "javascript"
        ],
        "medium_tags": [
            "web-development",
            "react",
            "javascript",
            "frontend",
            "backend"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 0,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "cyber_security": {
        "youtube_queries": [
            "cyber security full course",
            "ethical hacking",
            "penetration testing",
            "network security",
            "OWASP top 10",
            "bug bounty tutorial",
            "Kali Linux guide",
            "CTF walkthrough"
        ],
        "podcast_terms": [
            "cyber security",
            "ethical hacking",
            "bug bounty",
            "infosec",
            "penetration testing"
        ],
        "medium_tags": [
            "cybersecurity",
            "ethical-hacking",
            "network-security",
            "bug-bounty",
            "owasp"
        ],
        "arxiv_query": "cat:cs.CR",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 30,
        "min_views": 75000,
        "min_likes": 3000,
    },

    "business_entrepreneurship": {
        "youtube_queries": [
            "business strategy",
            "entrepreneurship course",
            "startup guide",
            "how to build startup",
            "business case study",
            "product management",
            "business fundamentals",
            "startup funding"
        ],
        "podcast_terms": [
            "entrepreneurship",
            "startup",
            "business",
            "founders",
            "venture capital"
        ],
        "medium_tags": [
            "startup",
            "entrepreneurship",
            "business",
            "product-management",
            "leadership"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 30,
        "article_target": 60,
        "pdf_target": 0,
        "min_views": 50000,
        "min_likes": 2500,
    },

        "finance_investing": {
        "youtube_queries": [
            "personal finance for beginners",
            "stock market investing",
            "mutual funds explained",
            "value investing",
            "fundamental analysis",
            "technical analysis",
            "financial freedom roadmap",
            "portfolio management"
        ],
        "podcast_terms": [
            "personal finance",
            "investing",
            "stock market",
            "wealth building",
            "finance"
        ],
        "medium_tags": [
            "finance",
            "investing",
            "stock-market",
            "wealth",
            "personal-finance"
        ],
        "arxiv_query": "cat:q-fin.*",
        "youtube_target": 70,
        "podcast_target": 25,
        "article_target": 55,
        "pdf_target": 25,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "english_communication": {
        "youtube_queries": [
            "english speaking practice",
            "english fluency",
            "public speaking",
            "communication skills",
            "english pronunciation",
            "spoken english full course",
            "business english",
            "presentation skills"
        ],
        "podcast_terms": [
            "english learning",
            "communication skills",
            "public speaking",
            "english fluency",
            "business english"
        ],
        "medium_tags": [
            "english",
            "communication",
            "public-speaking",
            "self-improvement",
            "writing"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 0,
        "min_views": 75000,
        "min_likes": 3000,
    },

    "fitness_nutrition": {
        "youtube_queries": [
            "strength training",
            "muscle building",
            "fat loss",
            "nutrition guide",
            "bodybuilding",
            "progressive overload",
            "home workout",
            "meal planning"
        ],
        "podcast_terms": [
            "fitness",
            "nutrition",
            "bodybuilding",
            "strength training",
            "fat loss"
        ],
        "medium_tags": [
            "fitness",
            "nutrition",
            "health",
            "workout",
            "bodybuilding"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 10,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "cooking": {
        "youtube_queries": [
            "cooking for beginners",
            "chef cooking techniques",
            "knife skills",
            "indian recipes",
            "italian cooking",
            "healthy recipes",
            "restaurant style cooking",
            "meal prep"
        ],
        "podcast_terms": [
            "cooking",
            "chef",
            "food",
            "recipes",
            "culinary"
        ],
        "medium_tags": [
            "cooking",
            "food",
            "recipes",
            "healthy-eating",
            "chef"
        ],
        "arxiv_query": None,
        "youtube_target": 80,
        "podcast_target": 15,
        "article_target": 70,
        "pdf_target": 5,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "photography_videography": {
        "youtube_queries": [
            "photography basics",
            "camera settings",
            "portrait photography",
            "cinematography",
            "video editing",
            "davinci resolve tutorial",
            "premiere pro editing",
            "lighting techniques"
        ],
        "podcast_terms": [
            "photography",
            "videography",
            "filmmaking",
            "cinematography",
            "camera"
        ],
        "medium_tags": [
            "photography",
            "videography",
            "cinematography",
            "editing",
            "camera"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 10,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "music": {
        "youtube_queries": [
            "music theory",
            "guitar lessons",
            "piano lessons",
            "music production",
            "FL Studio tutorial",
            "Ableton Live course",
            "singing lessons",
            "songwriting"
        ],
        "podcast_terms": [
            "music",
            "music production",
            "guitar",
            "piano",
            "songwriting"
        ],
        "medium_tags": [
            "music",
            "music-production",
            "guitar",
            "piano",
            "songwriting"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 5,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "dance": {
        "youtube_queries": [
            "dance tutorial",
            "hip hop dance",
            "contemporary dance",
            "bollywood dance",
            "freestyle dance",
            "dance choreography",
            "dance practice",
            "dance fundamentals"
        ],
        "podcast_terms": [
            "dance",
            "choreography",
            "performing arts",
            "hip hop",
            "movement"
        ],
        "medium_tags": [
            "dance",
            "performing-arts",
            "choreography",
            "fitness",
            "movement"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 15,
        "article_target": 60,
        "pdf_target": 5,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "football": {
        "youtube_queries": [
            "football training",
            "football tactics",
            "football dribbling",
            "football passing drills",
            "football shooting",
            "football coaching",
            "football fitness",
            "football analysis"
        ],
        "podcast_terms": [
            "football",
            "soccer",
            "football coaching",
            "premier league",
            "football tactics"
        ],
        "medium_tags": [
            "football",
            "soccer",
            "sports",
            "coaching",
            "training"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 5,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "psychology": {
        "youtube_queries": [
            "psychology basics",
            "human behaviour",
            "cognitive psychology",
            "behavioral psychology",
            "mental models",
            "emotional intelligence",
            "personality psychology",
            "social psychology"
        ],
        "podcast_terms": [
            "psychology",
            "mental health",
            "human behavior",
            "emotional intelligence",
            "brain"
        ],
        "medium_tags": [
            "psychology",
            "mental-health",
            "self-improvement",
            "behavior",
            "mindfulness"
        ],
        "arxiv_query": "cat:q-bio.NC OR cat:cs.AI",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 20,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "medicine": {
        "youtube_queries": [
            "human anatomy",
            "physiology",
            "medical school lectures",
            "clinical medicine",
            "pathology",
            "pharmacology",
            "medical education",
            "surgery basics"
        ],
        "podcast_terms": [
            "medicine",
            "medical education",
            "anatomy",
            "healthcare",
            "clinical medicine"
        ],
        "medium_tags": [
            "medicine",
            "healthcare",
            "biology",
            "medical",
            "anatomy"
        ],
        "arxiv_query": "cat:q-bio.*",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 30,
        "min_views": 50000,
        "min_likes": 2500,
    },

        "graphic_design": {
        "youtube_queries": [
            "graphic design course",
            "photoshop tutorial",
            "illustrator tutorial",
            "logo design",
            "branding design",
            "typography fundamentals",
            "color theory",
            "poster design"
        ],
        "podcast_terms": [
            "graphic design",
            "branding",
            "creative design",
            "ui design",
            "visual design"
        ],
        "medium_tags": [
            "graphic-design",
            "branding",
            "photoshop",
            "illustrator",
            "design"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 5,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "ui_ux_design": {
        "youtube_queries": [
            "ui ux design",
            "figma tutorial",
            "ux case study",
            "wireframing",
            "design thinking",
            "mobile app design",
            "web ui design",
            "user research"
        ],
        "podcast_terms": [
            "ui ux",
            "design thinking",
            "user experience",
            "figma",
            "product design"
        ],
        "medium_tags": [
            "ux",
            "ui",
            "figma",
            "product-design",
            "design-thinking"
        ],
        "arxiv_query": "cat:cs.HC",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 15,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "digital_marketing": {
        "youtube_queries": [
            "digital marketing course",
            "seo tutorial",
            "social media marketing",
            "facebook ads",
            "google ads",
            "content marketing",
            "email marketing",
            "marketing strategy"
        ],
        "podcast_terms": [
            "digital marketing",
            "seo",
            "content marketing",
            "branding",
            "social media"
        ],
        "medium_tags": [
            "marketing",
            "seo",
            "branding",
            "social-media",
            "content-marketing"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 10,
        "min_views": 75000,
        "min_likes": 3000,
    },

    "content_creation": {
        "youtube_queries": [
            "content creator guide",
            "youtube growth",
            "instagram growth",
            "creator economy",
            "personal branding",
            "viral content",
            "storytelling",
            "thumbnail design"
        ],
        "podcast_terms": [
            "content creator",
            "youtube",
            "creator economy",
            "social media",
            "personal branding"
        ],
        "medium_tags": [
            "youtube",
            "content-creation",
            "branding",
            "creator",
            "social-media"
        ],
        "arxiv_query": None,
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 5,
        "min_views": 100000,
        "min_likes": 5000,
    },

    "robotics": {
        "youtube_queries": [
            "robotics tutorial",
            "arduino robotics",
            "raspberry pi robot",
            "robotics engineering",
            "ROS tutorial",
            "robot arm",
            "robotics projects",
            "autonomous robots"
        ],
        "podcast_terms": [
            "robotics",
            "automation",
            "robot engineering",
            "ROS",
            "embedded systems"
        ],
        "medium_tags": [
            "robotics",
            "arduino",
            "ros",
            "automation",
            "embedded"
        ],
        "arxiv_query": "cat:cs.RO",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 30,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "blockchain": {
        "youtube_queries": [
            "blockchain explained",
            "web3 tutorial",
            "ethereum development",
            "smart contracts",
            "solidity course",
            "crypto technology",
            "blockchain projects",
            "defi explained"
        ],
        "podcast_terms": [
            "blockchain",
            "web3",
            "ethereum",
            "crypto",
            "defi"
        ],
        "medium_tags": [
            "blockchain",
            "ethereum",
            "web3",
            "crypto",
            "solidity"
        ],
        "arxiv_query": "cat:cs.CR",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 25,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "game_development": {
        "youtube_queries": [
            "unity tutorial",
            "unreal engine",
            "game development",
            "godot engine",
            "2d game tutorial",
            "3d game development",
            "game programming",
            "indie game dev"
        ],
        "podcast_terms": [
            "game development",
            "unity",
            "unreal engine",
            "indie games",
            "game design"
        ],
        "medium_tags": [
            "unity",
            "game-development",
            "gamedev",
            "unreal",
            "godot"
        ],
        "arxiv_query": "cat:cs.GR",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 60,
        "pdf_target": 15,
        "min_views": 50000,
        "min_likes": 2500,
    },

    "data_science": {
        "youtube_queries": [
            "data science roadmap",
            "pandas tutorial",
            "numpy tutorial",
            "data visualization",
            "statistics for data science",
            "sql for data science",
            "machine learning pipeline",
            "kaggle projects"
        ],
        "podcast_terms": [
            "data science",
            "analytics",
            "machine learning",
            "statistics",
            "kaggle"
        ],
        "medium_tags": [
            "data-science",
            "analytics",
            "pandas",
            "statistics",
            "machine-learning"
        ],
        "arxiv_query": "cat:cs.LG",
        "youtube_target": 70,
        "podcast_target": 20,
        "article_target": 50,
        "pdf_target": 30,
        "min_views": 75000,
        "min_likes": 3000,
    },

    "law": {
        "youtube_queries": [
            "law for beginners",
            "constitutional law",
            "criminal law",
            "contract law",
            "legal reasoning",
            "court procedure",
            "human rights law",
            "legal drafting"
        ],
        "podcast_terms": [
            "law",
            "legal",
            "court",
            "constitution",
            "criminal law"
        ],
        "medium_tags": [
            "law",
            "legal",
            "constitution",
            "justice",
            "human-rights"
        ],
        "arxiv_query": None,
        "youtube_target": 60,
        "podcast_target": 20,
        "article_target": 70,
        "pdf_target": 10,
        "min_views": 30000,
        "min_likes": 1500,
    },

    "history": {
        "youtube_queries": [
            "world history documentary",
            "ancient civilizations",
            "medieval history",
            "modern history",
            "history explained",
            "historical events",
            "history timeline",
            "history lectures"
        ],
        "podcast_terms": [
            "history",
            "world history",
            "civilizations",
            "ancient history",
            "historical events"
        ],
        "medium_tags": [
            "history",
            "civilization",
            "world-history",
            "culture",
            "education"
        ],
        "arxiv_query": None,
        "youtube_target": 60,
        "podcast_target": 20,
        "article_target": 70,
        "pdf_target": 15,
        "min_views": 30000,
        "min_likes": 1500,
    },
}

HEADERS = {"User-Agent": "Mozilla/5.0 (content-research-bot)"}


def clean_html(raw_html):
    if not raw_html:
        return ""
    text = BeautifulSoup(raw_html, "html.parser").get_text()
    return re.sub(r"\s+", " ", text).strip()


def load_existing():
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save(items):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


# ---- YOUTUBE ----

def scrape_youtube(category, queries, target):
    if not YOUTUBE_API_KEY:
        print("  [skip] YOUTUBE_API_KEY not set, skipping YouTube for", category)
        return []

    results = []
    per_query = max(10, target // len(queries))

    for query in queries:
        if len(results) >= target:
            break
        try:
            resp = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "key": YOUTUBE_API_KEY,
                    "q": query,
                    "part": "snippet",
                    "type": "video",
                    "maxResults": min(per_query, 50),
                    "relevanceLanguage": "en",
                    "videoCaption": "closedCaption",  # bias toward videos that have captions
                },
                timeout=15,
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
        except Exception as e:
            print(f"  [error] youtube search '{query}': {e}")
            continue

        for item in items:
            id_info = item.get("id", {})
            if id_info.get("kind") != "youtube#video":
                continue
            video_id = id_info.get("videoId")
            if not video_id:
                continue

            snippet = item.get("snippet")
            if not snippet:
                continue

            transcript_text = ""
            try:
                transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
                transcript_text = " ".join([t["text"] for t in transcript])[:1500]
            except (TranscriptsDisabled, NoTranscriptFound):
                pass
            except Exception:
                pass  # any other transcript failure -> just skip transcript, keep metadata

            results.append({
                "source_type": "video",
                "goal_category": category,
                "title": snippet.get("title", ""),
                "description": snippet.get("description", "")[:500],
                "transcript_snippet": transcript_text,
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "channel": snippet.get("channelTitle", ""),
            })
            if len(results) >= target:
                break
        time.sleep(0.3)  # be polite to the API

    print(f"  [youtube] {category}: {len(results)} videos")
    return results


# ---- PODCASTS (via iTunes Search API -> RSS feed -> episodes) ----

def scrape_podcasts(category, terms, target):
    results = []
    per_term = max(5, target // len(terms))

    for term in terms:
        if len(results) >= target:
            break
        try:
            resp = requests.get(
                "https://itunes.apple.com/search",
                params={"term": term, "media": "podcast", "limit": 5},
                headers=HEADERS,
                timeout=15,
            )
            resp.raise_for_status()
            podcasts = resp.json().get("results", [])
        except Exception as e:
            print(f"  [error] itunes search '{term}': {e}")
            continue

        for podcast in podcasts:
            feed_url = podcast.get("feedUrl")
            if not feed_url:
                continue
            try:
                feed = feedparser.parse(feed_url)
            except Exception:
                continue

            for entry in feed.entries[:max(3, per_term // len(podcasts) if podcasts else 3)]:
                audio_url = None
                for link in entry.get("links", []):
                    if link.get("type", "").startswith("audio"):
                        audio_url = link.get("href")
                        break

                results.append({
                    "source_type": "podcast",
                    "goal_category": category,
                    "title": entry.get("title", ""),
                    "description": clean_html(entry.get("summary", ""))[:500],
                    "url": audio_url or entry.get("link", ""),
                    "show_name": podcast.get("collectionName", ""),
                })
                if len(results) >= target:
                    break
            if len(results) >= target:
                break
        time.sleep(0.3)

    print(f"  [podcast] {category}: {len(results)} episodes")
    return results


# ---- ARTICLES (via Medium tag RSS feeds) ----

def scrape_articles(category, tags, target):
    results = []
    per_tag = max(5, target // len(tags))

    for tag in tags:
        if len(results) >= target:
            break
        feed_url = f"https://medium.com/feed/tag/{tag}"
        try:
            feed = feedparser.parse(feed_url)
        except Exception as e:
            print(f"  [error] medium tag '{tag}': {e}")
            continue

        for entry in feed.entries[:per_tag]:
            results.append({
                "source_type": "article",
                "goal_category": category,
                "title": entry.get("title", ""),
                "description": clean_html(entry.get("summary", ""))[:500],
                "url": entry.get("link", ""),
                "author": entry.get("author", ""),
            })
            if len(results) >= target:
                break
        time.sleep(0.3)

    print(f"  [article] {category}: {len(results)} articles")
    return results


# ---- PDFs (arXiv, AI/ML only) ----

def scrape_arxiv(category, query, target):
    if not query:
        return []
    results = []
    try:
        feed_url = (
            f"http://export.arxiv.org/api/query?search_query={query}"
            f"&sortBy=submittedDate&sortOrder=descending&max_results={target}"
        )
        feed = feedparser.parse(feed_url)
    except Exception as e:
        print(f"  [error] arxiv query '{query}': {e}")
        return []

    for entry in feed.entries[:target]:
        pdf_url = ""
        for link in entry.get("links", []):
            if link.get("type") == "application/pdf":
                pdf_url = link.get("href")
                break
        results.append({
            "source_type": "pdf",
            "goal_category": category,
            "title": entry.get("title", "").replace("\n", " ").strip(),
            "description": clean_html(entry.get("summary", ""))[:500],
            "url": pdf_url or entry.get("link", ""),
        })

    print(f"  [arxiv] {category}: {len(results)} papers")
    return results


# ---- MAIN ----

def main():
    all_items = load_existing()
    seen_urls = {item["url"] for item in all_items if item.get("url")}

    for category, cfg in GOAL_CATEGORIES.items():
        print(f"\n=== Scraping category: {category} ===")

        new_items = []
        new_items += scrape_youtube(category, cfg["youtube_queries"], cfg["youtube_target"])
        new_items += scrape_podcasts(category, cfg["podcast_terms"], cfg["podcast_target"])
        new_items += scrape_articles(category, cfg["medium_tags"], cfg["article_target"])
        if cfg.get("arxiv_query"):
            new_items += scrape_arxiv(category, cfg["arxiv_query"], cfg.get("pdf_target", 20))

        # dedup against everything collected so far
        for item in new_items:
            if item.get("url") and item["url"] not in seen_urls:
                all_items.append(item)
                seen_urls.add(item["url"])

        save(all_items)  # checkpoint after every category
        print(f"  -> total items so far: {len(all_items)}")

    print(f"\nDone. {len(all_items)} total items saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
