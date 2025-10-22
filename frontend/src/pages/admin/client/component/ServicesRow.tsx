import React, { memo } from 'react';
import { Link } from 'react-router-dom';

const ServicesRow = () => {
  // Dữ liệu mẫu để giữ lại giao diện
  const blogs = [
    {
      _id: '1',
      title: 'Top 10 đôi giày thể thao đáng mua năm 2025',
      slug: 'top-10-giay-the-thao-2025',
      thumbnail: 'https://via.placeholder.com/400x250.png?text=Blog+1',
      publishedAt: new Date().toISOString(),
      excerpt: 'Khám phá những đôi giày hot nhất năm 2025 được giới trẻ săn đón.',
    },
    {
      _id: '2',
      title: 'Cách bảo quản giày thể thao đúng cách',
      slug: 'bao-quan-giay-the-thao',
      thumbnail: 'https://via.placeholder.com/400x250.png?text=Blog+2',
      publishedAt: new Date().toISOString(),
      excerpt: 'Mẹo nhỏ giúp bạn giữ đôi giày luôn mới và bền lâu hơn.',
    },
    {
      _id: '3',
      title: 'Xu hướng giày sneaker 2025',
      slug: 'xu-huong-sneaker-2025',
      thumbnail: 'https://via.placeholder.com/400x250.png?text=Blog+3',
      publishedAt: new Date().toISOString(),
      excerpt: 'Cùng điểm qua những mẫu sneaker đang “làm mưa làm gió” trong giới trẻ.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">
          Xã hội giày thể thao & Tin tức giày
        </h2>
        <p className="text-gray-500 text-sm mt-1">Bài viết & xu hướng mới nhất</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {blogs.map((blog) => (
          <div
            key={blog._id}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
          >
            <Link to={`/blog/${blog.slug}`}>
              <img
                src={blog.thumbnail}
                alt={blog.title}
                className="w-full h-52 object-cover"
              />
            </Link>

            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-2">
                {blog.title}
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                {new Date(blog.publishedAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600 line-clamp-3 mb-2">
                {blog.excerpt}
              </p>
              <Link
                to={`/blog/${blog.slug}`}
                className="text-sm font-medium text-green-600 hover:underline"
              >
                Đọc thêm →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-right">
        <Link
          to="/blog"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="text-sm text-gray-500 hover:text-green-600 hover:underline"
        >
          Xem tất cả bài viết →
        </Link>
      </div>
    </div>
  );
};

export default memo(ServicesRow);