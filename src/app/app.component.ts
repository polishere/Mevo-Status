import { Component, OnInit } from '@angular/core';

import { DynamicScriptLoaderService } from './services/dynamic-script-loader.service';
import { HttpClient } from '@angular/common/http';

interface Station {
  uid: string;
  lat: number;
  lng: number;
  bike: boolean;
  name: string;
  address: string | null;
  spot: boolean;
  number: number;
  bikes: number;
  booked_bikes: number;
  bike_racks: number;
  free_racks: number;
  maintenance: boolean;
  terminal_type: string;
  bike_list: Bike[];
  bike_numbers: string[];
  bike_types: object;
  place_type: string;
  rack_locks: boolean;
  city: string;
}

interface Bike {
  number: string;
  bike_type: number;
  lock_types: string[];
  active: boolean;
  state: string;
  electric_lock: boolean;
  boardcomputer: number;
  pedelec_battery: number;
}

interface Bike {
  battery: number;
}

interface Battery {
  bike: string;
  battery: number;
  range: number;
  active: boolean;
}

interface Key {
  key: string;
}
declare const NEXTBIKE_BATTERIES;
declare const NEXTBIKE_PLACES_DB;
declare var ol: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [DynamicScriptLoaderService]
})
export class AppComponent implements OnInit {
  title = 'mevoStatus';
  stations: Station[] = [];
  batteries: Battery[] = [];
  bikes: Bike[] = [];
  stationWithAtLeastOneFreeBike: Station[] = [];
  stationWithAtLeastOneFreeBikeOld: Station[] = [];
  bikesWithMinBat = 0;
  minBattery = 50;
  map: any;
  gdansk: Station[] = [];
  vectorLayer: any;
  reserved = 0;
  constructor(private dynamicScriptLoader: DynamicScriptLoaderService, private http: HttpClient) {}

  getCities(): string[] {
    const cities: string[] = this.stations.map(station => station.city);
    return cities.filter((city, index, self) => self.indexOf(city) === index);
  }

  getStationsPerCity(city: string): Station[] {
    return this.stations.filter((station: Station) => station.city === city);
  }

  getAvailableBikes(stations: Station[]): number {
    return stations.map((station: Station) => station.bikes - station.booked_bikes)
      .reduce((acc, availableBikes) => acc + availableBikes, 0);
  }

  getReservedBikes(stations: Station[]): number {
    return stations
      .map((station: Station) => station.booked_bikes)
      .reduce((acc, bookedBikes) => acc + bookedBikes, 0);
  }

  getStatsPerCity(): object {
    const stats = {};
    this.getCities().forEach(city => {
      const stations = this.getStationsPerCity(city);
      stats[city] = {
        availableBikes: this.getAvailableBikes(stations),
        reservedBikes: this.getReservedBikes(stations),
        allBikes: stations.map((station: Station) => station.bikes)
        .reduce((acc, bikes) => acc + bikes, 0),
        bikes: [].concat(...stations.map(station => station.bike_list))
      };
    });
    return stats;
  }

  getBikesAlone(): Station[] {
    return this.stations.filter(station => station.name.includes('BIKE'));
  }



  ngOnInit() {
    // Just call your load scripts function with scripts you want to load
    this.loadScripts();
    this.map = new ol.Map({
      target: 'map',
      layers: [
        new ol.layer.Tile({
          source: new ol.source.OSM()
        })
      ],
      view: new ol.View({
        center: ol.proj.fromLonLat([73.8567, 18.5204]),
        zoom: 8
      })
    });
  }

  updateBikes() {
    this.bikesWithMinBat =  this.bikes.filter(bike => bike.battery >= this.minBattery).length;
    const stationsWithBikes = this.stations.filter(station => station.bikes > 0);
    this.reserved = this.stations.reduce((acc: number, station: Station) => acc + station.booked_bikes, 0);
    this.stationWithAtLeastOneFreeBike =
        stationsWithBikes.map(station =>
          ({...station, bike_list: station.bike_list.filter(bike => bike.pedelec_battery >= this.minBattery)}))
          .filter(st => st.bike_list.length > 0);
    console.log('Stations on map: ', this.stationWithAtLeastOneFreeBike.length );
    const view = this.map.getView();
    view.setCenter(ol.proj.fromLonLat([this.stationWithAtLeastOneFreeBike[0].lng, this.stationWithAtLeastOneFreeBike[0].lat]));
    view.setZoom(10);

    console.log(this.stations.filter(st => st.bike_list.length !== st.bikes));
    const features = [];
          // iterate through array...
    for (const item of this.stationWithAtLeastOneFreeBike) {
    const longitude = item.lng;
    const latitude = item.lat;

    const marker = new ol.Feature({
    geometry: new ol.geom.Point(
      ol.proj.fromLonLat([longitude, latitude])
      ),
    });

    marker.setStyle(new ol.style.Style({
      geometry: new ol.geom.Point(
      ol.proj.fromLonLat([longitude, latitude])
      ),
      fill: new ol.style.Fill({
      color: 'rgba(255,255,255,0.4)'
    }),
    stroke: new ol.style.Stroke({
      color: '#3399CC',
      width: 1.25
    }),
    text: new ol.style.Text({
      font: '15px Calibri,sans-serif',
      fill: new ol.style.Fill({ color: '#f00' }),
      stroke: new ol.style.Stroke({
        color: '#f00', width: 2
      }),
      offsetY: 0,
      backgroundFill: '#ff0',
      text: `${item.bike_list.length - item.booked_bikes}: ` + item.bike_list.map(bike => `${bike.pedelec_battery}%`).join (', ')
    })
  }));
    features.push(marker);
}

    const vectorSource = new ol.source.Vector({
    features
    });
    this.vectorLayer = new ol.layer.Vector({
      source: vectorSource
    });
    this.map.getLayers().forEach(element => {
      if (element.type === 'VECTOR') {
      this.map.removeLayer(element);
      }
    });
    this.map.addLayer(this.vectorLayer);

  }

  private loadScripts(): void {
   this.http.get('/key')
    .subscribe(data => {
      const key = (data as Key).key;
      this.dynamicScriptLoader.load(`https://rowermevo.pl/locations.js?key=${key}`).then(() => {
      this.batteries = JSON.parse(NEXTBIKE_BATTERIES) as Battery[];
      this.stations = JSON.parse(NEXTBIKE_PLACES_DB)[0].places as Station[];
      this.reserved = this.stations.reduce((acc: number, station: Station) => acc + station.booked_bikes, 0);
      this.stations.forEach(station => this.bikes.push(...station.bike_list.map(bike => {
          const battery: number = this.batteries.filter(bat => bat.bike === bike.number)[0].battery;
          return {...bike, battery};
      })));

      const stationsWithBikes = this.stations.filter(station => station.bikes > 0);
      console.log('Stations with at least one active bike', stationsWithBikes.length);
      this.stationWithAtLeastOneFreeBikeOld = stationsWithBikes.filter(station => station.bike_list.length - station.booked_bikes > 0);

      this.stationWithAtLeastOneFreeBike =
        stationsWithBikes.map(station =>
          ({...station, bike_list: station.bike_list.filter(bike => bike.pedelec_battery > this.minBattery)}))
          .filter(st => st.bike_list.length > 0);
      console.log('Stations with at least one free bike', this.stationWithAtLeastOneFreeBike.length);
      this.gdansk = this.stationWithAtLeastOneFreeBike.filter(x => x.city === 'Gdańsk');

      this.bikesWithMinBat =  this.bikes.filter(bike => bike.battery > this.minBattery).length;


      const view = this.map.getView();
      view.setCenter(ol.proj.fromLonLat([this.stationWithAtLeastOneFreeBike[0].lng, this.stationWithAtLeastOneFreeBike[0].lat]));
      view.setZoom(10);

      console.log(this.stations.filter(st => st.bike_list.length !== st.bikes));
      const features = [];
      // iterate through array...
      for (const item of this.stationWithAtLeastOneFreeBike) {
          const longitude = item.lng;
          const latitude = item.lat;

          const marker = new ol.Feature({
             geometry: new ol.geom.Point(
                ol.proj.fromLonLat([longitude, latitude])
             ),
          });

          marker.setStyle(new ol.style.Style({
            geometry: new ol.geom.Point(
            ol.proj.fromLonLat([longitude, latitude])
           ),
           fill: new ol.style.Fill({
            color: 'rgba(255,255,255,0.4)'
          }),
          stroke: new ol.style.Stroke({
            color: '#3399CC',
            width: 1.25
          }),
          text: new ol.style.Text({
            font: '15px Calibri,sans-serif',
            fill: new ol.style.Fill({ color: '#f00' }),
            stroke: new ol.style.Stroke({
              color: '#f00', width: 2
            }),
            offsetY: 0,
            backgroundFill: '#ff0',
            text: `${item.bike_list.length - item.booked_bikes}: ` + item.bike_list.map(bike => `${bike.pedelec_battery}%`).join (', ')
          })
        }));
          features.push(marker);
      }

      const vectorSource = new ol.source.Vector({
          features
      });
      this.vectorLayer = new ol.layer.Vector({
          source: vectorSource
      });
      this.map.addLayer(this.vectorLayer);

      console.log('Bikes with min 80% battery:', this.bikes.filter(bike => bike.battery > 80).length);

    }).catch(error => console.log(error));

    }, x => console.log(x));
  }
}
