import React from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const Pagination = ({ currentPage, totalPages, onPrevious, onNext }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="pagination-buttons">
            <button 
                className="page-button"
                onClick={onPrevious}
                disabled={currentPage === 0}
                title="Previous page"
            >
                <FaChevronLeft />
            </button>
            <span className="page-indicator">{currentPage + 1} / {totalPages}</span>
            <button 
                className="page-button"
                onClick={onNext}
                disabled={currentPage === totalPages - 1}
                title="Next page"
            >
                <FaChevronRight />
            </button>
        </div>
    );
};

export default Pagination;
