import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  CreateTariffProposalRequest,
  TariffProposal,
  TariffProposalStatus,
} from './models/tariff-proposal';

/** Calls /v1/tariff-proposals. Decisions carry the version seen, as If-Match. */
@Injectable({ providedIn: 'root' })
export class TariffProposalsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(status?: TariffProposalStatus): Observable<TariffProposal[]> {
    const params = status ? new HttpParams().set('status', status) : new HttpParams();
    return this.http.get<TariffProposal[]>(this.url(''), { params });
  }

  get(id: string): Observable<TariffProposal> {
    return this.http.get<TariffProposal>(this.url(`/${id}`));
  }

  create(request: CreateTariffProposalRequest): Observable<TariffProposal> {
    return this.http.post<TariffProposal>(this.url(''), request);
  }

  /** The Owner approves: the tariff is created or its prices change, as the Owner. */
  approve(proposal: TariffProposal, comment: string): Observable<TariffProposal> {
    return this.decide(proposal, 'approve', comment);
  }

  /** The Owner rejects, saying why. */
  reject(proposal: TariffProposal, comment: string): Observable<TariffProposal> {
    return this.decide(proposal, 'reject', comment);
  }

  /** Whoever proposed it takes it back. */
  withdraw(proposal: TariffProposal): Observable<TariffProposal> {
    return this.http.post<TariffProposal>(
      this.url(`/${proposal.id}/withdraw`),
      {},
      this.ifMatch(proposal),
    );
  }

  private decide(
    proposal: TariffProposal,
    decision: 'approve' | 'reject',
    comment: string,
  ): Observable<TariffProposal> {
    const body = comment.trim() ? { comment: comment.trim() } : {};
    return this.http.post<TariffProposal>(
      this.url(`/${proposal.id}/${decision}`),
      body,
      this.ifMatch(proposal),
    );
  }

  private ifMatch(proposal: TariffProposal) {
    return { headers: { 'If-Match': String(proposal.version) } };
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/tariff-proposals${path}`;
  }
}
