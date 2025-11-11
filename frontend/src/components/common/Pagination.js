import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ currentPage, totalPages, onPrevious, onNext }) => {
    // Always render pagination controls so the UI shows "1 / 1" even when there's a single page.
    const prevDisabled = currentPage <= 0;
    const nextDisabled = currentPage >= Math.max(0, totalPages - 1);

    return (
        <div className="pagination-buttons">
            <button 
                className="page-button"
                onClick={onPrevious}
                disabled={prevDisabled}
                title="Previous page"
            >
                <FaChevronLeft />
            </button>
            <span className="page-indicator">{(totalPages > 0 ? currentPage + 1 : 0)} / {totalPages}</span>
            <button 
                className="page-button"
                onClick={onNext}
                disabled={nextDisabled}
                title="Next page"
            >
                <FaChevronRight />
            </button>
        </div>
    );
};

export default Pagination;
