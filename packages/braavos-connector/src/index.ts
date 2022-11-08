import { AbstractConnector } from '@web3-starknet-react/abstract-connector';
import {AbstractConnectorArguments, ChainsLookupInterface, ConnectorUpdate} from '@web3-starknet-react/types';
import { AccountInterface } from 'starknet';
import { IStarknetWindowObject } from 'get-starknet';

const chainsLookup: ChainsLookupInterface = {
  '0x534e5f4d41494e': 1,
  'mainnet-alpha': 1,
  '0x534e5f474f45524c49': 5,
  'goerli-alpha': 5
}

export class NoStarknetProviderError extends Error {
  public constructor() {
    super();
    this.name = this.constructor.name;
    this.message = 'No Starknet Provider was found on window object';
  }
}

export class BraavosConnector extends AbstractConnector {
  constructor(kwargs: AbstractConnectorArguments) {
    super(kwargs);

    this.handleAccountsChanged = this.handleAccountsChanged.bind(this);
    this.handleNetworkChanged = this.handleNetworkChanged.bind(this);
  }

  public async activate(): Promise<ConnectorUpdate> {
    const wallet = this.getBraavosWallet();

    if (!wallet) {
      throw new NoStarknetProviderError();
    }

    wallet.on('accountsChanged', this.handleAccountsChanged);
    wallet.on('networkChanged', this.handleNetworkChanged);

    let account: AccountInterface | undefined = wallet.account;
    let connectedAddress: string | undefined = wallet.selectedAddress;

    if (!connectedAddress) {
      [connectedAddress] = (await wallet.enable()) ?? [];
      account = wallet.account;
    }

    const chainIdNumber = chainsLookup[wallet.provider.chainId] ?? 0;

    return {
      provider: wallet.provider,
      chainId: chainIdNumber,
      ...(account ? { account } : {}),
      ...(connectedAddress ? { connectedAddress } : {}),
    };
  }

  private handleAccountsChanged = async (accountAddresses: string[] | string) => {
    if (__DEV__) {
      console.log(
        "Handling 'accountsChanged' event with payload",
        accountAddresses
      );
    }

    if (accountAddresses.length === 0) {
      this.emitDeactivate();
    } else {
      const provider = await this.getProvider();
      this.emitUpdate({ connectedAddress: typeof accountAddresses == 'string' ? accountAddresses : accountAddresses[0], provider});
    }
  };

  private handleNetworkChanged = async (chainId: string) => {
    if (__DEV__) {
      console.log(
          "Handling 'networkChanged' event with payload",
          chainId
      );
    }
    const provider = await this.getProvider();
    const chainIdNumber = chainsLookup[chainId] ?? 0;
    this.emitUpdate({ chainId: chainIdNumber, provider });
  }

  public async getProvider(): Promise<any> {
    return this.getBraavosWallet()?.provider;
  }

  /**
   * @deprecated Use getAccount()
   * @returns AccountInterface
   */
  public getSigner(): AccountInterface | undefined {
    return this.getAccount();
  }

  public async getChainId(): Promise<string | number> {
    const wallet = this.getBraavosWallet();
    if (!wallet) {
      throw new NoStarknetProviderError();
    }

    const chainIdNumber = chainsLookup[wallet.provider.chainId] ?? 0;

    return chainIdNumber;
  }

  public getAccount(): AccountInterface | undefined {
    const wallet = this.getBraavosWallet();
    if (!wallet) {
      throw new NoStarknetProviderError();
    }

    return wallet.account;
  }

  public getConnectedAddress(): string | null {
    const wallet = this.getBraavosWallet();
    if (!wallet) {
      throw new NoStarknetProviderError();
    }

    return wallet.selectedAddress || null;
  }

  public deactivate(): void {
    if (this.getBraavosWallet()) {
      this.handleAccountsChanged([]);
    }
  }

  public async isAuthorized(): Promise<boolean> {
    const wallet = this.getBraavosWallet();
    return wallet?.isPreauthorized() ?? false;
  }

  private getBraavosWallet = (): IStarknetWindowObject | undefined =>
    [window.starknet, window.starknet_braavos].find(
      obj => obj?.id === 'braavos'
    );
}
