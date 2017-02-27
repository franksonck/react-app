import 'whatwg-fetch';
import {NetworkError, ApiError, EntityNotFoundError, BadDataError} from './errors'

import {API_RO_ENDPOINT, ZIPCODE_ENDPOINT} from '../conf'

export function fetchZipCodeCoordinates(zipCode) {
  const url = `${ZIPCODE_ENDPOINT}/search/?q=${zipCode}&postcode=${zipCode}`;
  console.log(`fetchZipCodeCoordinates, url: ${url}`);
  return fetch(url)
    .catch(function (err) {
      throw NetworkError('Cannot reach zipcode api');
    })
    .then(function (res) {
      if (res.ok) {
        return res.json();
      } else {
        throw new BadDataError('Bad response from zip code API');
      }
    })
    .then(function (content) {
      if (content.features.length === 0) {
        throw new EntityNotFoundError(`Zip code ${zipCode} does not exist.`);
      }

      const geometry = content.features[0].geometry;
      if (!geometry || geometry.type !== 'Point' || !geometry.coordinates || geometry.coordinates.length !== 2) {
        throw new BadDataError('Missing correct geometry attribute from response');
      }

      return geometry.coordinates;
    });
}

export function whereCloseTo(coordinates, maxDistance = 10000) {
  return {
    coordinates: {
      "$near": {
        "$geometry": {
          type: "Point",
          coordinates: coordinates,
        },
        "$maxDistance": maxDistance
      }
    }
  };
};

exports.fetchItems = function fetchItems(resource, options) {
  options = options || {};
  const {APIKey} = options;

  let url = `${API_RO_ENDPOINT}/${resource}/`;

  if (options.where) {
    const whereQueryString = JSON.stringify(options.where);
    url = `${url}?where=${whereQueryString}`
  }

  const init = {headers: new Headers()};

  if (APIKey) {
    appendAuthHeaders(init.headers, APIKey);
  }

  console.log(`fetchItems, url: ${url}`);

  return fetch(url, init)
    .catch(function (err) {
      // fetch only rejects on network failure
      throw new NetworkError('Cannot reach API');
    })
    .then(function (res) {
      return res.json();
    })
    .catch(function (err) {
      // err was thrown by the .json() method call
      throw new BadDataError('API response was not JSON');
    })
    .then(function (content) {
      if (!('_items' in content)) {
        throw new BadDataError('No _items field in response');
      }
      return content._items;
    });

}

export function fetchItem(resource, id, options) {
  options = options || {};
  const {APIKey} = options;

  const url = `${API_RO_ENDPOINT}/${resource}/${id}`;

  const init = {};

  if (APIKey) {
    appendAuthHeaders(init.headers, APIKey);
  }

  console.log(`fetchItem, url: ${url}`);

  return fetch(url, init)
    .catch(function (err) {
      // fetch only rejects on network failure
      throw new NetworkError('Cannot reach API');
    })
    .then(function (res) {
      if (!res.ok) {
        if (res.status === 404) {
          throw new EntityNotFoundError(`${resource}/${id} does not exist`);
        } else {
          throw new BadDataError(`Bad response from API (${res.status})`);
        }
      } else {
        return res.json();
      }
    })
    .catch(function (err) {
      if (err instanceof ApiError) {
        // rethrow if err is already an ApiError
        throw err;
      } else {
        // if not, it means the error comes from the .json() call
        throw new BadDataError('API response was not JSON');
      }
    });
}