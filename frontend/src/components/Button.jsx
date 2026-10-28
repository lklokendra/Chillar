export default function Button({
  variant = 'primary',
  size,
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}) {
  const classes = ['coin-btn', `coin-btn--${variant}`]
  if (size) classes.push(`coin-btn--${size}`)
  if (block) classes.push('coin-btn--block')
  if (className) classes.push(className)

  return (
    <button type={type} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  )
}
