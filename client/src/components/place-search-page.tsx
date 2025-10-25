import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Star, Clock, Phone, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: { photo_reference: string }[];
  opening_hours?: { open_now: boolean };
  formatted_phone_number?: string;
  website?: string;
  types?: string[];
}

interface PlaceSearchProps {
  value?: string;
  onPlaceSelect: (place: PlaceResult | null) => void;
  placeholder?: string;
}

export function PlaceSearch({ value = "", onPlaceSelect, placeholder = "Search for a place..." }: PlaceSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const searchPlaces = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 3) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Place search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(newQuery);
    }, 300);
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    setSelectedPlace(place);
    setQuery(place.name);
    setShowResults(false);
    onPlaceSelect(place);
  };

  const clearSelection = () => {
    setSelectedPlace(null);
    setQuery("");
    setResults([]);
    onPlaceSelect(null);
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return null;
    return "$".repeat(level);
  };

  const getPhotoUrl = (photoReference: string, maxWidth = 400) => {
    return `/api/places/photo?photo_reference=${photoReference}&maxwidth=${maxWidth}`;
  };

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-10 h-12"
            onFocus={() => {
              if (results.length > 0) setShowResults(true);
            }}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && results.length > 0 && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto">
            <CardContent className="p-0">
              {results.map((place) => (
                <div
                  key={place.place_id}
                  className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0 transition-colors"
                  onClick={() => handlePlaceSelect(place)}
                >
                  <div className="flex items-start gap-3">
                    {/* Place Photo */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {place.photos && place.photos.length > 0 ? (
                        <img
                          src={getPhotoUrl(place.photos[0].photo_reference, 100)}
                          alt={place.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Place Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{place.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">
                            {place.formatted_address}
                          </p>
                        </div>
                        
                        {/* Rating */}
                        {place.rating && (
                          <div className="flex items-center gap-1 text-xs">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{place.rating}</span>
                            {place.user_ratings_total && (
                              <span className="text-muted-foreground">
                                ({place.user_ratings_total})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-2 mt-1">
                        {place.price_level && (
                          <Badge variant="outline" className="text-xs">
                            {getPriceLevel(place.price_level)}
                          </Badge>
                        )}
                        
                        {place.opening_hours?.open_now !== undefined && (
                          <Badge 
                            variant={place.opening_hours.open_now ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {place.opening_hours.open_now ? "Open" : "Closed"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Place Card */}
      {selectedPlace && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Large Photo */}
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                  <img
                    src={getPhotoUrl(selectedPlace.photos[0].photo_reference, 200)}
                    alt={selectedPlace.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Place Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{selectedPlace.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ✕
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {selectedPlace.formatted_address}
                </p>

                {/* Metrics */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {selectedPlace.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{selectedPlace.rating}</span>
                      {selectedPlace.user_ratings_total && (
                        <span className="text-muted-foreground">
                          ({selectedPlace.user_ratings_total} reviews)
                        </span>
                      )}
                    </div>
                  )}

                  {selectedPlace.price_level && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Price:</span>
                      <span className="font-medium">{getPriceLevel(selectedPlace.price_level)}</span>
                    </div>
                  )}

                  {selectedPlace.opening_hours?.open_now !== undefined && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className={selectedPlace.opening_hours.open_now ? "text-green-600" : "text-red-600"}>
                        {selectedPlace.opening_hours.open_now ? "Open now" : "Closed"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  {selectedPlace.formatted_phone_number && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${selectedPlace.formatted_phone_number}`}>
                        <Phone className="h-3 w-3 mr-1" />
                        Call
                      </a>
                    </Button>
                  )}

                  {selectedPlace.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedPlace.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}