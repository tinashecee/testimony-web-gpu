"use client"

import type React from "react"
import { useState } from "react"
import { Search } from "lucide-react"

interface SearchBarProps {
  onSearch: (term: string) => void
  placeholder?: string
  defaultValue?: string
  autoFocus?: boolean
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, placeholder = "Search recordings, cases or transcripts...", defaultValue = "", autoFocus = true }) => {
  const [searchTerm, setSearchTerm] = useState(defaultValue)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchTerm.trim())
  }

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-4 py-2 pl-10 pr-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      <button
        type="submit"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Search
      </button>
    </form>
  )
}

export default SearchBar

