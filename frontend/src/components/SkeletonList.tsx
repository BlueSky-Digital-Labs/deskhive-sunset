import '@/styles/skeleton.css'

interface SkeletonListProps {
  count?: number
}

export function SkeletonList({ count = 3 }: SkeletonListProps) {
  return (
    <div className="skeleton-list" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="skeleton-list__item" />
      ))}
    </div>
  )
}

export default SkeletonList
