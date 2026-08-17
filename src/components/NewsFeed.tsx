import type { NewsItem } from '../lib/types'
import { timeAgo } from '../lib/format'

export function NewsFeed({ items }: { items: NewsItem[] }) {
  return (
    <div className="card">
      <h3>
        Market News<span className="tag">NEWS_SOURCE</span>
      </h3>
      {items.length === 0 ? (
        <div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="news-item">
              <div className="skeleton" style={{ width: `${85 - i * 7}%` }} />
              <div className="skeleton" style={{ width: '30%', height: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="news-list">
          {items.map((n) => (
            <article key={n.id} className="news-item">
              {n.link ? (
                <a href={n.link} target="_blank" rel="noreferrer noopener">
                  {n.title}
                </a>
              ) : (
                <span>{n.title}</span>
              )}
              <div className="news-meta">
                <span className="news-source">{n.source}</span>
                <span>{timeAgo(n.published)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
