import React from 'react'

function CommonText({ text, fontStyle=[], style={}, children, ...props}) {
    const size = fontStyle[0] || 14;
    const weight = fontStyle[1] || 400;
    const color = fontStyle[2] || '#FAFAFA';
    
    // Combine default styles with any passed styles
    const combinedStyle = {
        fontSize: `${size}px`,
        fontWeight: weight,
        color: color,
        ...style // This allows overriding any of the default styles
    };
    
    return (
        <div>
            <h1 style={combinedStyle} {...props}>{children ?? text}</h1>
        </div>
    )
}

export default CommonText