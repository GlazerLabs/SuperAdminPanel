import React from "react";

const Button = ({
	text = "text",
	disabled = false,
	leadingIcon = null,
	trailingIcon = null,
	variant = "primary",
	onClick,
	className = "",
	customBgColor = null,
	customPadding = 4, // Add new prop for custom background color
}) => {
	const baseStyles =
		`w-full rounded-md py-3 px-5 flex items-center justify-center gap-2 font-outfit transition-all duration-200`;

	const variants = {
		primary: "bg-[#3399EF] text-neutral-50 hover:bg-[#3399EF]/90 cursor-pointer",
		secondary:
			"border py-[11.4px] border-[#211f26] text-neutral-50 hover:bg-zinc-900/50 cursor-pointer",
		disabled: "bg-zinc-900 text-zinc-700 cursor-not-allowed",
	};

	// If custom background color is provided, use it instead of variant
	const buttonStyle = disabled 
		? variants.disabled 
		: customBgColor 
			? `text-neutral-50 hover:opacity-90 cursor-pointer`
			: variants[variant];

	// Apply custom background color as inline style if provided
	const customStyle = customBgColor ? { backgroundColor: customBgColor } : {};

	return (
		<button
			className={`${baseStyles} ${buttonStyle} ${className}`}
			style={customStyle}
			onClick={onClick}
			disabled={disabled}
		>
			{leadingIcon && (
				<img
					src={leadingIcon}
					alt=""
					className="w-6 h-6"
				/>
			)}
			<span
				className={`text-[14px] ${
					disabled ? "font-semibold" : "font-semibold "
				}`}
			>
				{text}
			</span>
			{trailingIcon && (
				<img
					src={leadingIcon}
					alt=""
					className="w-6 h-6"
				/>
			)}
		</button>
	);
};

export default Button;
