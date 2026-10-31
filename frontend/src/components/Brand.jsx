export default function Brand({ size = 'md', showTag = true }) {
  const isLarge = size === 'lg'
  
  return (
    <div className="coin-brand">
      <span className="coin-brand__mark" style={isLarge ? { width: '40px', height: '40px', fontSize: '22px' } : {}}>
        C
      </span>
      <div>
        <div className="coin-brand__name" style={isLarge ? { fontSize: '36px' } : { fontSize: '20px' }}>
          chillar
        </div>
        {showTag && <div className="coin-brand__tag">Track every coin</div>}
      </div>
    </div>
  )
}
