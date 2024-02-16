import { BigInt, store } from "@graphprotocol/graph-ts";
import {
  NFTKEYMarketplaceV2,
  TokenListed,
  TokenDelisted,
  TokenBought,
  TokenBidEntered,
  TokenBidWithdrawn,
  TokenBidAccepted,
} from "../generated/NFTKEYMarketplaceV2/NFTKEYMarketplaceV2";
import { Transfer } from "../generated/Nuggets/ERC721";
import { Listing, Sale, Bid } from "../generated/schema";

export function handleTokenListed(event: TokenListed): void {
  // i'll Create a unique ID for the Listing entity. This could be a combination of the token ID and the contract address to ensure uniqueness across different NFT contracts.
  let id =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();

  let listing = Listing.load(id);
  if (listing == null) {
    listing = new Listing(id);
  }

  // Since the tokenId is provided both at the root of the event and inside the listing,
  // it's redundant to use it twice so i will be Using the one from the root of the event for consistency.
  listing.tokenId = event.params.tokenId;
  // The event also includes the contract address, which is crucial for identifying which NFT contract the listing belongs to.
  listing.erc721Address = event.params.erc721Address;
  listing.seller = event.params.listing.seller;
  listing.price = event.params.listing.value;
  listing.expireTimestamp = event.params.listing.expireTimestamp;

  listing.save();
}

export function handleTokenDelisted(event: TokenDelisted): void {
  let id =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();
  let listing = Listing.load(id);
  if (listing) {
    listing.status = "Inactive";
    listing.save();
  }
}

export function handleTokenBought(event: TokenBought): void {
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let sale = new Sale(id);
  sale.erc721Address = event.params.erc721Address;
  sale.tokenId = event.params.tokenId;
  sale.buyer = event.params.buyer;
  sale.seller = event.params.listing.seller;
  sale.price = event.params.listing.value;
  sale.serviceFee = event.params.serviceFee;
  sale.royaltyFee = event.params.royaltyFee;
  sale.timestamp = event.block.timestamp;
  sale.save();

  // Optionally, update or remove the corresponding listing
  let listingId =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();
  // If you're marking listings as inactive instead of removing:
  let listing = Listing.load(listingId);
  if (listing) {
    listing.status = "Sold";
    listing.save();
  }
  // Or if you're removing listings once sold:
  // store.remove('Listing', listingId);
}

export function handleTokenBidEntered(event: TokenBidEntered): void {
  let id =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();
  let bid = Bid.load(id);
  if (bid == null) {
    bid = new Bid(id);
  }

  // Accessing nested 'bid' properties
  bid.erc721Address = event.params.erc721Address;
  bid.tokenId = event.params.bid.tokenId; // Accessing the nested tokenId
  bid.bidder = event.params.bid.bidder; // Accessing the nested bidder
  bid.value = event.params.bid.value; // Accessing the nested value
  bid.expireTimestamp = event.params.bid.expireTimestamp; // Accessing the nested expireTimestamp
  bid.status = "Active"; // Assuming you want to set the status when bid is entered
  bid.save();
}

export function handleTokenBidWithdrawn(event: TokenBidWithdrawn): void {
  let id =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();
  let bid = Bid.load(id);
  if (bid != null) {
    // Assuming you want to update the bid status when it's withdrawn
    bid.status = "Withdrawn";
    bid.save();
  }
}

export function handleTokenBidAccepted(event: TokenBidAccepted): void {
  // Create or update a Sale entity
  let saleId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let sale = new Sale(saleId);
  sale.erc721Address = event.params.erc721Address;
  sale.tokenId = event.params.tokenId;
  sale.buyer = event.params.bid.bidder; // Buyer is the bidder
  sale.seller = event.params.seller;
  sale.price = event.params.bid.value;
  sale.serviceFee = event.params.serviceFee;
  sale.royaltyFee = event.params.royaltyFee;
  sale.timestamp = event.block.timestamp;
  sale.save();

  // Update the Listing status to Sold
  let listingId =
    event.params.erc721Address.toHexString() +
    "-" +
    event.params.tokenId.toString();
  let listing = Listing.load(listingId);
  if (listing) {
    listing.status = "Sold";
    listing.save();
  }

  // Update the Bid status to Accepted
  let bidId =
    event.params.bid.bidder.toHexString() +
    "-" +
    event.params.tokenId.toString();
  let bid = Bid.load(bidId);
  if (bid) {
    bid.status = "Accepted";
    bid.save();
  } else {
    // not sure if i should add an Option to handle cases where the bid might not have been previously captured
  }
}
/// Set listing status to "Transferred" if an active listing is transferred outside the marketplace.
// this is because if an active listing is transfer the contract removes that listing from the marketplace
export function handleERC721Transfer(event: Transfer): void {
  // Construct a unique ID for the listing based on the ERC721 contract and token ID
  let id = event.address.toHexString() + "-" + event.params.tokenId.toString();

  // Load the listing from the subgraph store
  let listing = Listing.load(id);
  if (listing && listing.status == "Active") {
    // If the listing exists and is active, update its status
    listing.status = "Transferred";
    listing.save();
  }
}
