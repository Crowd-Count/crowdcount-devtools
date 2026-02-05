declare namespace mapkit {
  function init(options: {
    authorizationCallback: (done: (token: string) => void) => void;
  }): void;

  class Coordinate {
    constructor(latitude: number, longitude: number);
    latitude: number;
    longitude: number;
  }

  class CoordinateRegion {
    constructor(center: Coordinate, span: CoordinateSpan);
  }

  class CoordinateSpan {
    constructor(latitudeDelta: number, longitudeDelta: number);
  }

  class Map {
    constructor(element: HTMLElement, options?: MapConstructorOptions);
    center: Coordinate;
    region: CoordinateRegion;
    annotations: MarkerAnnotation[];
    addAnnotation(annotation: MarkerAnnotation): void;
    addAnnotations(annotations: MarkerAnnotation[]): void;
    removeAnnotation(annotation: MarkerAnnotation): void;
    removeAnnotations(annotations: MarkerAnnotation[]): void;
    setRegionAnimated(region: CoordinateRegion, animate?: boolean): void;
    setCenterAnimated(coordinate: Coordinate, animate?: boolean): void;
    convertPointOnPageToCoordinate(point: DOMPoint): Coordinate;
    addEventListener(type: string, listener: (event: MapEvent) => void): void;
    removeEventListener(type: string, listener: (event: MapEvent) => void): void;
    destroy(): void;
    static readonly ColorSchemes: {
      Dark: string;
      Light: string;
    };
  }

  interface MapConstructorOptions {
    center?: Coordinate;
    region?: CoordinateRegion;
    colorScheme?: string;
  }

  interface MapEvent {
    annotation?: MarkerAnnotation;
    pointOnPage?: { x: number; y: number };
  }

  class MarkerAnnotation {
    constructor(coordinate: Coordinate, options?: MarkerAnnotationOptions);
    coordinate: Coordinate;
    title: string;
    subtitle: string;
    color: string;
    selected: boolean;
  }

  interface MarkerAnnotationOptions {
    title?: string;
    subtitle?: string;
    color?: string;
    glyphText?: string;
    calloutEnabled?: boolean;
    selected?: boolean;
    data?: unknown;
  }
}
