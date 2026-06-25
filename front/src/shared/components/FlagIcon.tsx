import React from 'react';

interface FlagIconProps {
  locale: 'en' | 'fr';
  size?: number;
  className?: string;
}

export const FlagIcon: React.FC<FlagIconProps> = ({ locale, size = 16, className = '' }) => {
  if (locale === 'en') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 1235 650"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="American flag"
      >
        {/* Les 13 bandes alternées (7 rouges, 6 blanches) */}
        <rect width="1235" height="650" fill="#B22234" />
        <rect width="1235" height="50" y="50" fill="#FFFFFF" />
        <rect width="1235" height="50" y="150" fill="#FFFFFF" />
        <rect width="1235" height="50" y="250" fill="#FFFFFF" />
        <rect width="1235" height="50" y="350" fill="#FFFFFF" />
        <rect width="1235" height="50" y="450" fill="#FFFFFF" />
        <rect width="1235" height="50" y="550" fill="#FFFFFF" />
        
        {/* Le canton bleu (Union) */}
        <rect width="494" height="350" fill="#002868" />
        
        {/* Définition d'une vraie étoile à 5 branches */}
        <defs>
          <g id="star">
            <polygon points="0,-12.3 3.6,-3.6 12.9,-3.6 5.4,1.9 8.2,10.6 0,5.3 -8.2,10.6 -5.4,1.9 -12.9,-3.6 -3.6,-3.6" fill="#FFFFFF" />
          </g>
        </defs>
        
        {/* Les 50 étoiles positionnées selon le ratio officiel (9 rangées alternées) */}
        {/* Rangée 1, 3, 5, 7, 9 : 6 étoiles */}
        <g id="rows-of-6">
          <g id="row1">
            <use href="#star" x="41.1" y="35" /><use href="#star" x="123.4" y="35" /><use href="#star" x="205.6" y="35" /><use href="#star" x="287.9" y="35" /><use href="#star" x="370.1" y="35" /><use href="#star" x="452.4" y="35" />
          </g>
          <use href="#row1" y="70" />
          <use href="#row1" y="140" />
          <use href="#row1" y="210" />
          <use href="#row1" y="280" />
        </g>
        
        {/* Rangée 2, 4, 6, 8 : 5 étoiles imbriquées */}
        <g id="rows-of-5">
          <g id="row2">
            <use href="#star" x="82.2" y="70" /><use href="#star" x="164.5" y="70" /><use href="#star" x="246.7" y="70" /><use href="#star" x="329" y="70" /><use href="#star" x="411.2" y="70" />
          </g>
          <use href="#row2" y="70" />
          <use href="#row2" y="140" />
          <use href="#row2" y="210" />
        </g>
      </svg>
    );
  }

  if (locale === 'fr') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 60 30"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="French flag"
      >
        <rect x="0" y="0" width="20" height="30" fill="#002395" />
        <rect x="20" y="0" width="20" height="30" fill="white" />
        <rect x="40" y="0" width="20" height="30" fill="#ED2939" />
      </svg>
    );
  }

  return null;
};