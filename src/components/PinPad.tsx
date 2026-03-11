import React, { useState } from 'react';
import { Delete, Check, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface PinPadProps {
  onComplete: (pin: string) => void;
  error?: string;
}

export const PinPad: React.FC<PinPadProps> = ({ onComplete, error }) => {
  const [pin, setPin] = useState('');

  const handleNumber = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleSubmit = () => {
    if (pin.length >= 4) {
      onComplete(pin);
      setPin('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md mx-auto p-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Enter PIN</h2>
        <p className="text-zinc-400">Enter your 4-6 digit employee PIN</p>
      </div>

      <div className="flex justify-center space-x-4 h-12">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              i < pin.length ? 'bg-emerald-500 border-emerald-500 scale-125' : 'border-zinc-700'
            }`}
          />
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 font-medium"
        >
          {error}
        </motion.p>
      )}

      <div className="grid grid-cols-3 gap-4 w-full">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumber(num.toString())}
            className="h-20 text-2xl font-bold bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-800 shadow-lg"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleDelete}
          className="h-20 flex items-center justify-center bg-zinc-900 text-zinc-400 rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-800"
        >
          <Delete size={28} />
        </button>
        <button
          onClick={() => handleNumber('0')}
          className="h-20 text-2xl font-bold bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 active:scale-95 transition-all border border-zinc-800"
        >
          0
        </button>
        <button
          onClick={handleSubmit}
          disabled={pin.length < 4}
          className={`h-20 flex items-center justify-center rounded-2xl active:scale-95 transition-all border shadow-lg ${
            pin.length >= 4
              ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-500'
              : 'bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed'
          }`}
        >
          <Check size={28} />
        </button>
      </div>

      <Link
        to="/admin"
        className="flex items-center space-x-2 text-zinc-500 hover:text-zinc-300 transition-all pt-4"
      >
        <Shield size={18} />
        <span className="text-sm font-medium">Switch to Admin Login</span>
      </Link>
    </div>
  );
};
