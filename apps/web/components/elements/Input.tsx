import React from "react";
import { UseFormRegister, FieldValues } from "react-hook-form";
import Label from "./Label";

interface InputProps {
  id: string;
  label: string;
  register?: UseFormRegister<FieldValues>;
  requiredMessage?: string;
  errors?: any;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  id,
  label,
  register,
  requiredMessage,
  errors,
  value,
  onChange,
  required,
  disabled,
  onKeyDown,
}) => {
  return (
    <div className="mb-4 flex w-full flex-col">
      <Label htmlFor={id} label={label} />
      <input
        id={id}
        {...(register && id ? register(id, { required: requiredMessage }) : {})}
        className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-gray-500"
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        onKeyDown={onKeyDown}
      />
      {errors && errors[id] && (
        <p className="mt-1 text-xs text-red-500">{errors[id].message}</p>
      )}
    </div>
  );
};

export default Input;
