/**
 * Testimonials Block Component - local HugoBlox extension.
 * Keeps the existing quote-card presentation while exposing the review facts
 * that are also emitted in the page's JSON-LD.
 */

function renderText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function formatReviewDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const locale = document.documentElement?.lang || "en-AU";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function ReviewMeta({item}) {
  const rating = Number(item.rating);
  const bestRating = Number(item.best_rating) || 5;
  if (!item.course_name && !item.review_date && !item.source_label && !rating) return null;

  return (
    <div class="mt-4 space-y-1 text-xs text-gray-600 dark:text-gray-400">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        {rating > 0 && (
          <span class="font-semibold text-amber-600 dark:text-amber-300" aria-label={`${rating} out of ${bestRating} stars`}>
            {"★".repeat(Math.min(5, Math.round(rating)))} {rating}/{bestRating}
          </span>
        )}
        {item.course_name && <span>{item.course_name}</span>}
      </div>
      <div class="flex flex-wrap gap-x-2 gap-y-1">
        {item.review_date && <time dateTime={item.review_date}>{formatReviewDate(item.review_date)}</time>}
        {item.source_label && <span>{item.source_label}</span>}
      </div>
    </div>
  );
}

function Avatar({item, avatarUrl}) {
  const initial = item.name ? item.name.trim()[0].toUpperCase() : "?";
  if (avatarUrl) {
    return (
      <img
        class="h-10 w-10 rounded-full object-cover ring-2 ring-primary-100 dark:ring-primary-900/50"
        src={avatarUrl}
        width="40"
        height="40"
        alt={item.name || ""}
        loading="lazy"
      />
    );
  }
  return (
    <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 text-base font-bold text-white">
      {initial}
    </div>
  );
}

function TestimonialCard({item, avatarUrl}) {
  return (
    <div class="flex flex-col rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 transition-shadow duration-200 hover:shadow-md dark:bg-gray-800 dark:ring-gray-700">
      <blockquote class="mb-6 flex-1">
        <p class="text-base leading-relaxed text-gray-700 dark:text-gray-300" dangerouslySetInnerHTML={{__html: `“${renderText(item.text)}”`}} />
        <ReviewMeta item={item} />
      </blockquote>
      <div class="flex items-center gap-3">
        <Avatar item={item} avatarUrl={avatarUrl} />
        <div>
          {item.name && <div class="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</div>}
          {item.role && <div class="text-xs text-gray-500 dark:text-gray-400">{item.role}</div>}
        </div>
      </div>
    </div>
  );
}

export const TestimonialsBlock = ({content, _id, item_images, review_url}) => {
  const title = content?.title;
  const text = content?.text;
  const items = Array.isArray(content?.items) ? content.items : [];
  const imageMap = item_images || {};
  const gridCols =
    items.length === 1
      ? ""
      : items.length === 2
        ? "grid grid-cols-1 gap-6 sm:grid-cols-2"
        : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div class="mx-auto max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
      {(title || text || review_url) && (
        <div class="mx-auto mb-12 max-w-screen-md text-center lg:mb-16">
          {title && <h2 class="mb-4 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white" dangerouslySetInnerHTML={{__html: renderText(title)}} />}
          {text && <p class="text-gray-500 dark:text-gray-400 sm:text-xl" dangerouslySetInnerHTML={{__html: renderText(text)}} />}
          {review_url && content?.google_reviews_text && (
            <a class="mt-5 inline-flex font-semibold text-primary-700 underline underline-offset-4 dark:text-primary-300" href={review_url} target="_blank" rel="noopener noreferrer">
              {content.google_reviews_text}
            </a>
          )}
        </div>
      )}
      <div class={gridCols}>
        {items.map((item, idx) => <TestimonialCard key={idx} item={item} avatarUrl={imageMap[String(idx)]?.src || null} />)}
      </div>
    </div>
  );
};
