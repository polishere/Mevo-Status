import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { from } from 'rxjs/Observable/from';
import { map } from 'rxjs/operator/map';

import { DynamicScriptLoaderService } from './services/dynamic-script-loader.service';
import { markParentViewsForCheck } from '@angular/core/src/view/util';
import { AgmRectangle } from '@agm/core';

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
declare const NEXTBIKE_BATTERIES;
declare const NEXTBIKE_PLACES_DB;
declare var ol: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [DynamicScriptLoaderService]
})
export class AppComponent implements OnInit{
  title = 'mevoStatus';
  stations: Station[] = [];
  batteries: Battery[] = [];
  bikes: Bike[] = [];
  stationWithAtLeastOneFreeBike: Station[] = [];
  bikesWithMinBat = 0;
  map: any;
  gdansk: Station[] = [];
  constructor(private dynamicScriptLoader: DynamicScriptLoaderService) {}

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

  private loadScripts() {
    // You can load multiple scripts by just providing the key as argument into load method of the service
    this.dynamicScriptLoader.load('Mevo').then(data => {
      this.batteries = JSON.parse(NEXTBIKE_BATTERIES) as Battery[];
      this.stations = JSON.parse(NEXTBIKE_PLACES_DB)[0].places as Station[];

      this.stations.forEach(station => this.bikes.push(...station.bike_list.map(bike => {
          const battery: number = this.batteries.filter(bat => bat.bike === bike.number)[0].battery;
          return {...bike, battery};
      })));

      const stationsWithBikes = this.stations.filter(station => station.bikes > 0);
      console.log('Stations with at least one active bike', stationsWithBikes.length);
      this.stationWithAtLeastOneFreeBike = stationsWithBikes.filter(station => station.bike_list.length - station.booked_bikes > 0);
      console.log('Stations with at least one free bike', this.stationWithAtLeastOneFreeBike.length);
      this.gdansk = this.stationWithAtLeastOneFreeBike.filter(x => x.city === 'Gdańsk');


      this.bikesWithMinBat =  this.bikes.filter(bike => bike.battery > 50).length;
      const view = this.map.getView();
      view.setCenter(ol.proj.fromLonLat([this.stationWithAtLeastOneFreeBike[0].lng, this.stationWithAtLeastOneFreeBike[0].lat]));
      view.setZoom(10);

      console.log(this.stations.filter(st => st.bike_list.length !== st.bikes));
      const features = [];
      // iterate through array...
      for (const item of this.stationWithAtLeastOneFreeBike) {
          const longitude = item.lng;
          const latitude = item.lat;
          /*....
          * now get your specific icon...('..../ic_customMarker.png')
          * by e.g. switch case...
          */
          const iconPath = 'https://image.flaticon.com/icons/svg/33/33622.svg';
          // create Feature... with coordinates
          const marker = new ol.Feature({
             geometry: new ol.geom.Point(
                ol.proj.fromLonLat([longitude, latitude])
             ),  // Cordinates of New York's Town Hall
             // fill: new ol.style.Fill({options: {color: '#ffcc66' }}),
            // text: new ol.style.Text({
            //   text: `Dostepne rowery: ${item.bikes - item.booked_bikes}`
            // })
          });

          marker.setStyle(new ol.style.Style({
            geometry: new ol.geom.Point(
            ol.proj.fromLonLat([longitude, latitude])
           ),  // Cordinates of New York's Town Hall
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
            // get the text from the feature - `this` is ol.Feature
            // and show only under certain resolution
            text: `${item.bike_list.length - item.booked_bikes}: ` + item.bike_list.map(bike => `${bike.pedelec_battery}%`).join (', ')
          })
          //   text: new ol.style.Text({
          //   text: `${item.bikes - item.booked_bikes}`
          // })
        }));

        //   marker.setStyle( new ol.style.Style({
        //     label : `Dostepne rowery: ${item.bikes - item.booked_bikes}`,
        //     pointRadius: 10,
        //     fillColor: '#ffcc66',
        //     // fillOpacity: 0.8,
        //     // strokeColor: '#cc6633',
        //     // strokeWidth: 2,
        //     // strokeOpacity: 0.8
        // }));

          features.push(marker);
      }
      /*
      * create vector source
      * you could set the style for all features in your vectoreSource as well
      */
      const vectorSource = new ol.source.Vector({
          features      // add an array of features
          // ,style: iconStyle     //to set the style for all your features...
      });
      const vectorLayer = new ol.layer.Vector({
          source: vectorSource
      });
      this.map.addLayer(vectorLayer);




      console.log('Bikes with min 80% battery:', this.bikes.filter(bike => bike.battery > 80).length);

    }).catch(error => console.log(error));
  }
}
