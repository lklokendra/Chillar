import { useId } from 'react'

/** Compact checkbox used by the auth forms (currently just "Remember me"). */
export default function Checkbox({ label, ...inputProps }) {
  const id = useId()

  return (
    <label className="coin-check" htmlFor={id}>
      <input id={id} type="checkbox" className="coin-check__box" {...inputProps} />
      <span className="coin-check__label">{label}</span>
    </label>
  )
}
