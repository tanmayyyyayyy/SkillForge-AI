import React from 'react';

interface EditorialHeroProps {
  userName?: string;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({ userName }) => {
  // Determine time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const formattedName = (userName || 'STUDENT').toUpperCase();

  return (
    <section className="editorial-hero-section" aria-label="Dashboard Overview Greeting">
      <div className="editorial-hero-greeting">
        <span>{getGreeting()}, {formattedName}</span>
      </div>
      <h1 className="editorial-hero-headline">
        What am I <span className="editorial-serif-italic">missing?</span><br />
        What should I do <span className="editorial-serif-italic">next?</span>
      </h1>
    </section>
  );
};
