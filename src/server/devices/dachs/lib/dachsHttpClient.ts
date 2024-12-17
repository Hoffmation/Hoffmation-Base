import axios, { AxiosInstance, AxiosResponse } from 'axios';
import ReadKeyList from './ReadKeyList';
import * as _ from 'lodash';
import { DachsClientOptions, iFlattenedCompleteResponse, KeyListEntityResponse } from '../interfaces';
import keyTemplates from './keyTemplates';
import { LogDebugType } from '../../../services';
import { LogLevel } from '../../../../models';
import * as http from 'node:http';
import * as https from 'node:https';

/**
 * axios HTTP Client Class
 * - with some prepared fetch functions for data
 * @author Trickfilm400
 * @version 1
 * @class
 */
export class DachsHttpClient {
  private options: DachsClientOptions;
  //baseURL
  private readonly url: string;
  private axiosInstance: AxiosInstance;

  constructor(
    options: DachsClientOptions,
    private readonly _logger: (level: LogLevel, message: string, logDebugType?: LogDebugType) => void,
  ) {
    this.options = options;
    //combine parameter to baseUrl
    //check http prefix
    axios.defaults.httpsAgent = new https.Agent({ keepAlive: false });
    axios.defaults.httpAgent = new http.Agent({ keepAlive: false });
    const protocol = options.protocol ? options.protocol : 'http';
    this.options.host = this.options.host.startsWith('http') ? this.options.host : `${protocol}://${this.options.host}`;
    //combine all parameter for url
    this.url = `${this.options.host}:${this.options.port ?? 8080}`;
    this.axiosInstance = axios.create({
      auth: {
        username: this.options.username || 'glt',
        password: this.options.password || '',
      },
      baseURL: this.url,
    });

    // Interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        this._logger(LogLevel.Error, `DachsHttpClient: ${error.message}`, LogDebugType.DachsUnreach);
      },
    );
  }

  /**
   * Takes every key and add the key to the get parameter list
   * @param {string[]} keys - Array of request keys
   * @private
   * @author Trickfilm400
   * @version 1
   * @return {string} The final and complete get parameter string
   */
  private urlBuilder(keys: string[]) {
    let url = '?';
    keys.forEach((key) => {
      url += `k=${key}&`;
    });
    return url;
  }

  /**
   * main request function
   * @author Trickfilm400
   * @version 1
   * @param {string[]} keys - Array of request keys
   * @return Promise
   */
  fetchByKeys(...keys: string[]): Promise<{ [id: string]: KeyListEntityResponse<string | number | boolean> }> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .get('/getKey' + this.urlBuilder(keys))
        .then((res: AxiosResponse<string>) => {
          if (!res.data) reject('No data received');
          resolve(this.parser(res.data));
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  fetchAllKeys(): Promise<iFlattenedCompleteResponse> {
    const all = [
      ...keyTemplates.BetriebsDatenDachs,
      ...keyTemplates.Aktoren,
      ...keyTemplates.BetriebsDaten3112,
      ...keyTemplates.Temperatures,
      ...keyTemplates.Daten2Waermeerzeuger,
      ...keyTemplates.HydraulikSchema,
      ...keyTemplates.MehrmodulTechnik,
      ...keyTemplates.Tageslauf,
      ...keyTemplates.Wartung,
    ];
    return this.fetchByKeys(...all) as unknown as Promise<iFlattenedCompleteResponse>;
  }

  public setKeys(data: { [key: string]: string }): Promise<AxiosResponse<string>> {
    return new Promise((resolve, reject) => {
      this.axiosInstance
        .post(
          '/setKeys',
          Object.entries(data)
            .map(([key, value]) => `${key}=${value}`)
            .join('&'),
        )
        .then((res: AxiosResponse<string>) => {
          resolve(res);
        })
        .catch(reject);
    });
  }

  /**
   * Parses the RAW HTTP Response from the request into key-value paris
   * @author Trickfilm400
   * @version 1
   * @param {string} res - The raw Result from the HTTP Request
   * @return Partial<IReadKeyList> The parsed key value pairs from the result in a JSON
   * @private
   */
  private parser(res: string): { [id: string]: KeyListEntityResponse<string | number | boolean> } {
    //console.log(res);
    //remove "\n\n" from the end
    res = res.trim();
    //split to line by line
    const array = res.split('\n');
    const result: { [id: string]: KeyListEntityResponse<string | number | boolean> } = {};
    //loop through every result line
    array.forEach((line) => {
      //split key and value
      const [key, value] = line.split('=');
      //fetch key data, mostly for unit conversion
      let keyData = _.get(ReadKeyList, key);
      let resultValue = keyData?.unit(value) ?? value;
      if (this.options.resultConfig?.flatten) {
        result[key] = resultValue;
        return;
      }
      //create object value
      let val: KeyListEntityResponse<string | number | boolean> = {
        value: resultValue,
      };
      //check for adding optional value data via config
      if (this.options.resultConfig?.addRawValue) val.rawValue = value;
      if (this.options.resultConfig?.addKeyObject) val.key = keyData;
      //save to return object
      result[key] = val;
    });
    //console.log(result);
    return result;
  }
}
