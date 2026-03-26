/**
 * SubjectViewer — displays the current subject's media (image, video, etc.)
 *
 * Panoptes subjects have a `locations` array where each entry is an object
 * like { "image/png": "https://..." }. This component renders the first
 * image-type location.
 */
function SubjectViewer({ subject }) {
  if (!subject) {
    return <div className="subject-viewer-empty">No subject loaded</div>;
  }

  // Find the first image URL from subject locations
  const imageUrl = getImageUrl(subject);
  const metadata = subject.metadata || {};

  return (
    <div className="subject-viewer">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={metadata['#name'] || metadata.Filename || `Subject ${subject.id}`}
          className="subject-image"
        />
      ) : (
        <div className="subject-viewer-empty">
          <p>No image available for this subject</p>
          <pre className="whitespace-pre-wrap break-words" style={{ fontSize: '12px' }}>
            {JSON.stringify(subject.locations, null, 2)}
          </pre>
        </div>
      )}
      <div className="subject-meta">
        <span className="text-muted" style={{ fontSize: '12px' }}>
          Subject {subject.id}
        </span>
      </div>
    </div>
  );
}

function getImageUrl(subject) {
  if (!subject.locations) return null;
  for (const location of subject.locations) {
    for (const [mimeType, url] of Object.entries(location)) {
      if (mimeType.startsWith('image/')) return url;
    }
  }
  return null;
}

export default SubjectViewer;
