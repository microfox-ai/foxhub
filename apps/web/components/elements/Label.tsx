import React from 'react'

interface LabelProps {
  htmlFor: string
  label: string
}

const Label: React.FC<LabelProps> = ({ htmlFor, label }) => {
  return (
    <label
      htmlFor={htmlFor}
      className=" text-sm font-medium text-gray-700 cursor-pointer"
    >
      {label}
    </label>
  )
}

export default Label
