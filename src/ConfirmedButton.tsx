import React from 'react';

export const ConfirmedButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
        onClick: () => void;
        children: React.ReactNode;
    }
> = ({ onClick, children, ...props }) => {
    const [isConfirming, setIsConfirming] = React.useState(false);

    const handleClick = () => {
        if (!isConfirming) {
            setIsConfirming(true);
            setTimeout(() => setIsConfirming(false), 4000);
            return;
        }
        onClick();
        setIsConfirming
    };

    return (
        <button
            onClick={handleClick}
            {...props}
        >
            {isConfirming ? "Are you sure?" : children}
        </button>
    );
};
