export function FieldError({ message }: { message: string }) {
  return (
    <div style={{ position: 'relative', marginTop: '2px' }}>
      <div style={{
        position: 'absolute',
        top: -5,
        left: 14,
        width: 0,
        height: 0,
        borderLeft: '5px solid transparent',
        borderRight: '5px solid transparent',
        borderBottom: '5px solid #374151',
      }} />
      <div
        role="alert"
        style={{
          backgroundColor: '#374151',
          color: '#fff',
          borderRadius: '6px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          lineHeight: 1.4,
        }}
      >
        <span style={{
          backgroundColor: '#f97316',
          color: '#fff',
          borderRadius: '3px',
          padding: '0.1rem 0.35rem',
          fontWeight: 700,
          fontSize: '0.75rem',
          flexShrink: 0,
          lineHeight: 1.5,
        }}>!</span>
        {message}
      </div>
    </div>
  )
}
