/**
 * PaginationControls - 分頁控制元件
 * 「載入更多」按鈕。
 */
export default function PaginationControls({ hasMore, isLoading, onLoadMore }) {
  if (!hasMore) return null;

  return (
    <div className="mt-4 text-center">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="btn btn-secondary"
      >
        {isLoading ? '載入中...' : '載入更多'}
      </button>
    </div>
  );
}
