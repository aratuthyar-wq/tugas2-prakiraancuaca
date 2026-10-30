import axios from 'axios';

export default class EndPointAccess {
  theUrl: string;

  constructor(url: string) {
    this.theUrl = url;
  }

  async getRes() {
    const response = await axios.get(this.theUrl) ;
    return response;
  }
}