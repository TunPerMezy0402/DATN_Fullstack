import React, { memo } from 'react';

const brands = [
  {
    name: 'Nike',
    items: 150,
    discount: 20,
    image: 'nike-logo.png',
  },
  {
    name: 'Adidas',
    items: 120,
    discount: 15,
    image: 'adidas-logo.jpg',
  },
  {
    name: 'Puma',
    items: 85,
    image: 'puma-logo.png',
  },
  {
    name: 'Converse',
    items: 60,
    image: 'converse-logo.png',
  },
  {
    name: 'Vans',
    items: 90,
    discount: 10,
    image: 'vans-logo.png',
  },
  {
    name: 'Reebok',
    items: 70,
    image: 'reebok-logo.png',
  },
    {
    name: 'Converse',
    items: 60,
    image: 'converse-logo.png',
  },
  {
    name: 'Vans',
    items: 90,
    discount: 10,
    image: 'vans-logo.png',
  },
  {
    name: 'Reebok',
    items: 70,
    image: 'reebok-logo.png',
  },
];

const Menu = () => {
  return (
    <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5 max-w-7xl mx-auto px-2">
      {brands.map((brand, index) => (
        <div
          key={index}
          className="group flex flex-col items-center justify-center bg-gradient-to-br from-white to-gray-50 border border-gray-200 hover:border-teal-500 rounded-2xl p-5 shadow hover:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <div className="relative">
            <img
              alt={`${brand.name} logo`}
              className="mx-auto h-14 w-14 object-contain"
              src={`/image/${brand.image}`}
            />
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-3 group-hover:text-teal-600 transition">
            {brand.name}
          </p>
        </div>
      ))}
    </div>
  );
};

export default memo(Menu);
