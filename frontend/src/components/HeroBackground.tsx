import React from 'react';

const HeroBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a]">
      <div
        className="absolute left-1/2 top-1/2 -z-10 h-[550px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle at center, rgba(230, 0, 0, 0.3), transparent 50%)',
          filter: 'blur(120px)',
        }}
      />
      <div
        className="absolute left-[30%] top-[20%] -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'linear-gradient(to right, rgba(0, 120, 255, 0.3), rgba(0, 220, 255, 0.3))',
          filter: 'blur(100px)',
          transform: 'rotate(-30deg)',
        }}
      />
       <div
        className="absolute left-[70%] top-[80%] -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: 'linear-gradient(to right, rgba(255, 0, 120, 0.2), rgba(255, 100, 0, 0.2))',
          filter: 'blur(100px)',
          transform: 'rotate(20deg)',
        }}
      />
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
    </div>
  );
};

export default HeroBackground;
